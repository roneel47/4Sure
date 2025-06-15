
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameRoom, PlayerData, Guess, MultiplayerGameStatus, TurnUpdateData } from '@/types/game';
import { calculateFeedback, checkWin, CODE_LENGTH } from '@/lib/gameLogic';
import { MongoClient, Db as MongoDb, FindOneAndUpdateOptions, MongoError } from 'mongodb';

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
}

interface CustomSocket extends Socket {
  gameId?: string;
  playerId?: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = "4SureDB";
const COLLECTION_NAME = "gameRooms";

let dbConnectionPromise: Promise<MongoDb | null> = (async () => {
  console.log("[SocketIO] Attempting to connect to MongoDB...");
  if (!MONGODB_URI) {
    console.warn('[SocketIO] MONGODB_URI not found. Database operations will be unavailable.');
    return null;
  }
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const connectedDb = client.db(DATABASE_NAME);
    console.log(`[SocketIO] Successfully connected to MongoDB. Database: ${DATABASE_NAME}`);
    console.log(`[SocketIO] Targeting collection: '${COLLECTION_NAME}'. Ensure unique index on 'gameId' and TTL index on 'createdAt'.`);
    return connectedDb;
  } catch (error) {
    console.error("[SocketIO] Error connecting to MongoDB:", error);
    return null;
  }
})();


async function getGameRoom(db: MongoDb, gameId: string): Promise<GameRoom | null> {
  try {
    const roomDocument = await db.collection(COLLECTION_NAME).findOne({ gameId: gameId }, { projection: { _id: 0 } });
    return roomDocument as GameRoom | null;
  } catch (error) {
    console.error(`[SocketIO-DB] getGameRoom: Error fetching game room ${gameId}:`, error);
    return null;
  }
}

async function createGameRoom(db: MongoDb, gameId: string, playerCount: number, hostSocketId: string): Promise<GameRoom | null> {
    const initialPlayerData: PlayerData = {
        socketId: hostSocketId,
        secret: [],
        guessesMade: [],
        guessesAgainst: [],
        hasSetSecret: false,
        isReady: false,
    };

    const roomToInsert: GameRoom = {
        gameId,
        playerCount,
        players: { "player1": initialPlayerData },
        status: 'WAITING_FOR_PLAYERS',
        targetMap: {},
        createdAt: new Date(),
    };

    try {
      const result = await db.collection<Omit<GameRoom, '_id'>>(COLLECTION_NAME).insertOne(roomToInsert);
      if (result.insertedId) {
        console.log(`[SocketIO-DB] Game room ${gameId} created successfully by host ${hostSocketId}.`);
        return roomToInsert;
      }
      return null;
    } catch (error: any) {
      if (error instanceof MongoError && error.code === 11000) { 
        console.warn(`[SocketIO-DB] createGameRoom: ${gameId} already exists. Attempting to fetch.`);
        return getGameRoom(db, gameId);
      }
      console.error(`[SocketIO-DB] createGameRoom: Error creating game room ${gameId}:`, error);
      return null;
    }
}

async function updateGameRoom(db: MongoDb, gameId: string, updateOperators: any): Promise<GameRoom | null> {
  const filter = { gameId: gameId };
  const options: FindOneAndUpdateOptions = { returnDocument: 'after', upsert: false, projection: { _id: 0 } };

  try {
    const result = await db.collection<GameRoom>(COLLECTION_NAME).findOneAndUpdate(filter, updateOperators, options);
    return result as GameRoom | null; 
  } catch (error: any) {
    console.error(`[SocketIO-DB] updateGameRoom: Error for ${gameId}. Update: ${JSON.stringify(updateOperators)}, Error:`, error);
    return null;
  }
}

async function deleteGameOverRooms(db: MongoDb): Promise<void> {
  if (!db) {
    console.warn("[SocketIO-DB Cleanup] No DB connection. Skipping cleanup of GAME_OVER rooms.");
    return;
  }
  try {
    const result = await db.collection(COLLECTION_NAME).deleteMany({ status: 'GAME_OVER' });
    if (result.deletedCount > 0) {
      console.log(`[SocketIO-DB Cleanup] Successfully deleted ${result.deletedCount} rooms with status GAME_OVER.`);
    }
  } catch (error) {
    console.error("[SocketIO-DB Cleanup] Error deleting GAME_OVER rooms:", error);
  }
}


const getPlayerCountNumber = (playerCountString: string | null): number => {
  if (playerCountString === 'duo') return 2;
  if (playerCountString === 'trio') return 3;
  if (playerCountString === 'quads') return 4;
  return 0; 
};

const turnTimers = new Map<string, { timerId: NodeJS.Timeout, turnPlayerId: string }>();
const INITIAL_TIME_LIMIT_MULTIPLAYER = 30; // seconds

async function startTurnTimer(gameId: string, currentPlayerTurnId: string, io: SocketIOServer) {
    console.log(`[SocketIO Timer] Attempting to start timer for game ${gameId}, player ${currentPlayerTurnId}`);
    if (turnTimers.has(gameId)) {
        const existingTimer = turnTimers.get(gameId)!;
        console.log(`[SocketIO Timer] Clearing existing timer for game ${gameId}, player ${existingTimer.turnPlayerId}`);
        clearTimeout(existingTimer.timerId);
        turnTimers.delete(gameId);
    }

    const currentDb = await dbConnectionPromise;
    if (!currentDb) {
        console.error(`[SocketIO Timer] No DB connection for game ${gameId}, player ${currentPlayerTurnId}. Timer not started.`);
        return;
    }

    const timerId = setTimeout(async () => {
        console.log(`[SocketIO Timer] Game ${gameId}: Timer EXPIRED for player ${currentPlayerTurnId}.`);
        turnTimers.delete(gameId); 

        const room = await getGameRoom(currentDb, gameId);
        if (!room || !room.players || !room.targetMap) {
             console.error(`[SocketIO Timer] Game ${gameId}: Room, players, or targetMap not found for timeout processing of player ${currentPlayerTurnId}.`);
             return;
        }
        if (room.status === 'IN_PROGRESS' && room.turn === currentPlayerTurnId) {
            console.log(`[SocketIO Timer] Game ${gameId}: Processing timeout for player ${currentPlayerTurnId}.`);
            
            const activePlayerIdsWithSockets = Object.keys(room.players).filter(pid => room.players[pid]?.socketId);
            if (activePlayerIdsWithSockets.length === 0) {
                console.log(`[SocketIO Timer] Game ${gameId}: No active players left. Aborting timeout turn change.`);
                return;
            }
            
            let nextPlayerId: string | undefined = room.targetMap[currentPlayerTurnId];
            
            if (!nextPlayerId) {
                 console.error(`[SocketIO Timer] Game ${gameId}: Could not determine next player after timeout for ${currentPlayerTurnId} from targetMap. Current turn: ${room.turn}, TargetMap: ${JSON.stringify(room.targetMap)}`);
                 const currentIndex = activePlayerIdsWithSockets.indexOf(currentPlayerTurnId);
                 if (currentIndex !== -1 && activePlayerIdsWithSockets.length > 0) { 
                    nextPlayerId = activePlayerIdsWithSockets[(currentIndex + 1) % activePlayerIdsWithSockets.length];
                    console.warn(`[SocketIO Timer] Game ${gameId}: Fallback to sequential next player: ${nextPlayerId}`);
                 } else {
                    console.error(`[SocketIO Timer] Game ${gameId}: Fallback failed. Aborting turn change.`);
                    return;
                 }
            }
            
            if (!nextPlayerId) {
                 console.error(`[SocketIO Timer] Game ${gameId}: Still could not determine next player. Aborting turn change.`);
                 return;
            }


            console.log(`[SocketIO Timer] Game ${gameId}: Timeout. Switching turn from ${currentPlayerTurnId} to ${nextPlayerId}.`);
            const updatedRoom = await updateGameRoom(currentDb, gameId, { $set: { turn: nextPlayerId } });
            if (updatedRoom) {
                const turnUpdateData: TurnUpdateData = { gameId, nextPlayerId, reason: 'timeout' };
                io.to(gameId).emit('turn-update', turnUpdateData);
                io.to(gameId).emit('game-state-update', updatedRoom);
                if (updatedRoom.status === 'IN_PROGRESS' && updatedRoom.turn) {
                    startTurnTimer(gameId, updatedRoom.turn, io);
                }
            } else {
                 console.error(`[SocketIO Timer] Game ${gameId}: Failed to update room after timeout for player ${currentPlayerTurnId}.`);
            }
        } else {
            console.log(`[SocketIO Timer] Game ${gameId}: Timer expired for ${currentPlayerTurnId}, but game state changed (Status: ${room?.status}, CurrentTurn: ${room?.turn}). No action taken by this timer.`);
        }
    }, INITIAL_TIME_LIMIT_MULTIPLAYER * 1000);

    turnTimers.set(gameId, { timerId, turnPlayerId: currentPlayerTurnId });
    console.log(`[SocketIO Timer] Game ${gameId}: Timer SET for player ${currentPlayerTurnId} (${INITIAL_TIME_LIMIT_MULTIPLAYER}s).`);
}

function clearTurnTimer(gameId: string) {
    if (turnTimers.has(gameId)) {
        const timerDetails = turnTimers.get(gameId)!;
        clearTimeout(timerDetails.timerId);
        turnTimers.delete(gameId);
        console.log(`[SocketIO Timer] Game ${gameId}: Timer CLEARED for player ${timerDetails.turnPlayerId}.`);
    }
}


export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method === 'POST') { 
    const currentDb = await dbConnectionPromise;
    if (currentDb) {
      await deleteGameOverRooms(currentDb); // Perform cleanup of GAME_OVER rooms
    } else {
      console.warn("[SocketIO] DB connection not available during POST init, skipping cleanup of GAME_OVER rooms.");
    }

    if (!res.socket.server.io) {
      console.log('[SocketIO] Initializing Socket.IO server...');
      const io = new SocketIOServer(res.socket.server, {
        path: '/api/socketio_c',
        addTrailingSlash: false,
        transports: ['websocket'] 
      });
      res.socket.server.io = io;

      const db = currentDb; // Use the already awaited db connection
      if (!db) {
        console.error("[SocketIO] MongoDB connection failed, Socket.IO server will not handle DB operations.");
      }

      io.on('connection', (socket: CustomSocket) => {
          if (!db) {
            console.error(`[SocketIO] Connection ${socket.id}: DB instance is null. Disconnecting.`);
            socket.emit('error-event', { message: 'Server database error. Please try again later.' });
            socket.disconnect(true);
            return;
          }
          console.log(`[SocketIO] Socket connected: ${socket.id}`);

          socket.on('disconnect', async () => {
            const gameId = socket.gameId;
            const playerId = socket.playerId;
            console.log(`[SocketIO] Socket disconnected: ${socket.id}, Player: ${playerId}, Game: ${gameId}`);

            if (gameId && playerId) {
              let room = await getGameRoom(db, gameId);
              if (!room || !room.players || !room.players[playerId]) {
                  console.warn(`[SocketIO] Disconnect ${socket.id}: Room ${gameId} or player ${playerId} not found for disconnect processing.`);
                  return;
              }
              
              if (room.players[playerId].socketId !== socket.id && room.players[playerId].socketId !== undefined) {
                  console.log(`[SocketIO] Disconnect ${socket.id}: Player ${playerId} in room ${gameId} has a different active socket (${room.players[playerId].socketId}). No action taken by this older socket disconnect.`);
                  return;
              }
              
              let updateOps: any = { $set: { [`players.${playerId}.socketId`]: undefined }};
              
              if (room.status !== 'IN_PROGRESS' && room.status !== 'GAME_OVER') {
                  updateOps.$set[`players.${playerId}.isReady`] = false;
                  updateOps.$set[`players.${playerId}.hasSetSecret`] = false;
              }
              
              let roomAfterPlayerUpdate = await updateGameRoom(db, gameId, updateOps);
              if (!roomAfterPlayerUpdate) {
                  console.warn(`[SocketIO] Disconnect ${socket.id}: Failed to mark player ${playerId} socket as undefined. Fetching last known state.`);
                  roomAfterPlayerUpdate = await getGameRoom(db, gameId); 
              }
              if(!roomAfterPlayerUpdate) {
                console.error(`[SocketIO] Disconnect ${socket.id}: Could not get room state for ${gameId} after player update failed.`);
                return;
              }
              room = roomAfterPlayerUpdate;

              const activePlayersWithSocketId = Object.values(room.players).filter(p => p.socketId);
              
              if (room.status !== 'IN_PROGRESS' && room.status !== 'GAME_OVER') {
                  if (activePlayersWithSocketId.length < room.playerCount) {
                      room.status = 'WAITING_FOR_PLAYERS';
                  } else { 
                      const allActivePlayersReady = activePlayersWithSocketId.every(p => p.isReady);
                      room.status = allActivePlayersReady ? 'READY_TO_START' : 'WAITING_FOR_READY';
                  }
                  const statusUpdateResult = await updateGameRoom(db, gameId, {$set: {status: room.status}});
                  if (statusUpdateResult) room = statusUpdateResult; 
                  else {
                    const refetchedRoom = await getGameRoom(db, gameId);
                    if (refetchedRoom) room = refetchedRoom; else return;
                  }
              } else if (room.status === 'IN_PROGRESS' && room.playerCount === 2 && activePlayersWithSocketId.length < room.playerCount) {
                  const winnerId = activePlayersWithSocketId[0] ? Object.keys(room.players).find(pId => room.players[pId!]?.socketId === activePlayersWithSocketId[0].socketId) : undefined;
                  const anyGuessesMadeInGame = room.players ? Object.values(room.players).some(p => p.guessesMade && p.guessesMade.length > 0) : false;
                  const durationSinceGameStart = room.inProgressSince ? (new Date().getTime() - new Date(room.inProgressSince).getTime()) / 1000 : 0;

                  if (winnerId && room.targetMap && Object.keys(room.targetMap).length > 0) {
                      if ((durationSinceGameStart > 7 && anyGuessesMadeInGame) || durationSinceGameStart > 15) {
                          console.log(`[SocketIO] Game ${gameId}: Player ${playerId} disconnected during active game (${durationSinceGameStart.toFixed(1)}s in, guesses: ${anyGuessesMadeInGame}). ${winnerId} wins by default.`);
                          clearTurnTimer(gameId);
                          const finalRoomState = await updateGameRoom(db, gameId, {$set: {status: 'GAME_OVER', winner: winnerId, turn: undefined}});
                          if (finalRoomState) {
                              io.to(gameId).emit('game-over', {gameId, winner: winnerId});
                              room = finalRoomState;
                          } else {
                              const refetchedRoom = await getGameRoom(db, gameId);
                              if (refetchedRoom) room = refetchedRoom; else return;
                          }
                      } else {
                          console.log(`[SocketIO] Game ${gameId}: Player ${playerId} disconnected early in active game (${durationSinceGameStart.toFixed(1)}s in, guesses: ${anyGuessesMadeInGame}). Game not ended automatically. Allowing rejoin.`);
                          if(room.turn === playerId) {
                             clearTurnTimer(gameId); 
                          }
                      }
                  } else if (winnerId && (!room.targetMap || Object.keys(room.targetMap).length === 0)) {
                     console.log(`[SocketIO] Game ${gameId}: Player ${playerId} disconnected before targetMap fully established or game properly started. Game not ended. Status: ${room.status}.`);
                  }
              }
              
              if(room) io.to(gameId).emit('game-state-update', room); 
            }
          });

          socket.on('join-game', async (data: { gameId: string; playerCount: string; isHost?: boolean; rejoiningPlayerId?: string }) => {
              const { gameId, playerCount: playerCountString, isHost, rejoiningPlayerId } = data;
              console.log(`[SocketIO] Socket ${socket.id} joining game: ${gameId}. isHost: ${isHost}, rejoiningAs: ${rejoiningPlayerId}`);

              const numPlayerCount = getPlayerCountNumber(playerCountString);
              if (!numPlayerCount) {
                socket.emit('error-event', { message: 'Invalid player count.' }); return;
              }

              let room = await getGameRoom(db, gameId);
              let assignedPlayerId: string | undefined = undefined;

              if (!room) {
                  if (isHost) {
                      console.log(`[SocketIO] Game ${gameId}: Creating room as host ${socket.id}.`);
                      room = await createGameRoom(db, gameId, numPlayerCount, socket.id);
                      if (!room) { socket.emit('error-event', { message: 'Failed to create room.' }); return; }
                      assignedPlayerId = "player1";
                  } else {
                      socket.emit('error-event', { message: 'Room not found.' }); return;
                  }
              } else { 
                  if (rejoiningPlayerId && room.players && room.players[rejoiningPlayerId]) {
                      const playerSlot = room.players[rejoiningPlayerId];
                      if (playerSlot.socketId && playerSlot.socketId !== socket.id) {
                           socket.emit('error-event', { message: `Slot ${rejoiningPlayerId} is currently active with another session.` }); return;
                      }
                      console.log(`[SocketIO] Game ${gameId}: Player ${rejoiningPlayerId} (${socket.id}) rejoining.`);
                      assignedPlayerId = rejoiningPlayerId;
                      if(!room.players[assignedPlayerId]) { // Should not happen if rejoiningPlayerId is valid
                        room.players[assignedPlayerId] = { socketId: socket.id, hasSetSecret: false, isReady: false, guessesMade: [], guessesAgainst: [], secret: [] };
                      }
                      room.players[assignedPlayerId]!.socketId = socket.id; 
                      
                  } else {
                      let foundSlot = false;
                      for (let i = 1; i <= room.playerCount; i++) {
                          const potentialPlayerId = `player${i}`;
                          if (!room.players[potentialPlayerId] || !room.players[potentialPlayerId].socketId) {
                              assignedPlayerId = potentialPlayerId;
                              room.players[assignedPlayerId] = { 
                                  socketId: socket.id, 
                                  secret: room.players[assignedPlayerId]?.secret || [], 
                                  guessesMade: room.players[assignedPlayerId]?.guessesMade || [], 
                                  guessesAgainst: room.players[assignedPlayerId]?.guessesAgainst || [], 
                                  hasSetSecret: room.players[assignedPlayerId]?.hasSetSecret || false, 
                                  isReady: room.players[assignedPlayerId]?.isReady || false
                              };
                              console.log(`[SocketIO] Game ${gameId}: New player ${assignedPlayerId} (${socket.id}) assigned.`);
                              foundSlot = true;
                              break;
                          }
                      }
                      if (!foundSlot) {
                          const activePlayerIds = Object.entries(room.players)
                              .filter(([pid, pdata]) => pdata.socketId)
                              .map(([pid]) => pid);
                          socket.emit('error-event', { message: `Game room ${gameId} is full. Active players: ${activePlayerIds.join(', ')}` }); 
                          return;
                      }
                  }
              }

              if (!assignedPlayerId || !room) {
                  socket.emit('error-event', { message: 'Failed to assign player to room.' }); return;
              }
              
              socket.playerId = assignedPlayerId;
              socket.gameId = gameId;
              await socket.join(gameId); 
              socket.emit('player-assigned', { playerId: assignedPlayerId, gameId });

              const activePlayersWithSocketId = Object.values(room.players).filter(p => p.socketId);
             
              if (room.status !== 'IN_PROGRESS' && room.status !== 'GAME_OVER') {
                if (activePlayersWithSocketId.length === room.playerCount) {
                    const allActivePlayersReady = activePlayersWithSocketId.every(p => p.isReady);
                    room.status = allActivePlayersReady ? 'READY_TO_START' : 'WAITING_FOR_READY';
                } else if (activePlayersWithSocketId.length < room.playerCount) {
                    room.status = 'WAITING_FOR_PLAYERS'; 
                }
              }
              
              const finalRoomState = await updateGameRoom(db, gameId, { $set: { players: room.players, status: room.status } });
              if (!finalRoomState) { 
                  console.error(`[SocketIO-DB] Critical: Failed to save final room state for ${gameId} after join. Player: ${assignedPlayerId}`);
                  socket.emit('error-event', { message: 'Server error saving game state.' });
                  const fetchedRoom = await getGameRoom(db, gameId); 
                  if (fetchedRoom) io.to(gameId).emit('game-state-update', fetchedRoom);
                  return;
              }
              
              io.to(gameId).emit('game-state-update', finalRoomState);
              if(finalRoomState.status === 'IN_PROGRESS' && finalRoomState.turn === assignedPlayerId && !finalRoomState.winner) {
                console.log(`[SocketIO] Game ${gameId}: Player ${assignedPlayerId} rejoining, it's their turn. Starting timer.`);
                startTurnTimer(gameId, assignedPlayerId, io);
              }
          });
        
          socket.on('send-secret', async (data: { gameId: string; playerId: string; secret: string[] }) => {
            const { gameId, playerId: clientPlayerId, secret } = data;
        
            if (socket.playerId !== clientPlayerId) {
                console.warn(`[SocketIO] Security Alert: Socket ${socket.id} (server-assigned: ${socket.playerId}) ` +
                             `tried to send secret using client-provided ID ${clientPlayerId} in game ${gameId}. Denying.`);
                socket.emit('error-event', { message: 'Player ID mismatch.' });
                return;
            }
        
            console.log(`[SocketIO] Socket ${socket.id} (Player ${socket.playerId}) attempting to set secret & ready for game: ${gameId}.`);
            
            let room = await getGameRoom(db, gameId);
            if (!room) { socket.emit('error-event', { message: 'Game room not found.' }); return; }
            if (!room.players || !room.players[socket.playerId!] ) { socket.emit('error-event', { message: 'Player not found in room.' }); return; }
            if (secret.length !== CODE_LENGTH) { socket.emit('error-event', {message: `Secret must be ${CODE_LENGTH} digits.`}); return; }

            const playerUpdatePath = `players.${socket.playerId}`;
            const updateOps = {
                $set: {
                    [`${playerUpdatePath}.secret`]: secret,
                    [`${playerUpdatePath}.hasSetSecret`]: true,
                    [`${playerUpdatePath}.isReady`]: true,
                }
            };
        
            let updatedRoom = await updateGameRoom(db, gameId, updateOps);
            if (!updatedRoom || !updatedRoom.players) {
                socket.emit('error-event', { message: 'Failed to save secret.' });
                console.error(`[SocketIO-DB] Failed to update room ${gameId} after secret submission for ${socket.playerId}.`);
                const fetchedRoom = await getGameRoom(db, gameId);
                if(fetchedRoom) io.to(gameId).emit('game-state-update', fetchedRoom);
                return;
            }
            
            io.to(gameId).emit('game-state-update', updatedRoom); 
        
            const activePlayers = Object.values(updatedRoom.players).filter(p => p.socketId);
            const allActivePlayersReady = activePlayers.length === updatedRoom.playerCount && activePlayers.every(p => p.isReady && p.hasSetSecret);
        
            if (allActivePlayersReady && updatedRoom.status !== 'READY_TO_START' && updatedRoom.status !== 'IN_PROGRESS' && updatedRoom.status !== 'GAME_OVER') {
                console.log(`[SocketIO] Game ${gameId}: All ${updatedRoom.playerCount} players are ready. Status changing to READY_TO_START.`);
                const finalRoomState = await updateGameRoom(db, gameId, { $set: { status: 'READY_TO_START' } });
                if (finalRoomState) {
                    io.to(gameId).emit('game-state-update', finalRoomState);
                } else {
                     console.error(`[SocketIO-DB] Failed to update room ${gameId} to READY_TO_START.`);
                     const currentRoomState = await getGameRoom(db, gameId);
                     if(currentRoomState) io.to(gameId).emit('game-state-update', currentRoomState);
                }
            }
        });

        socket.on('request-start-game', async (data: { gameId: string }) => {
            const { gameId } = data;
            if (socket.playerId !== 'player1') {
                socket.emit('error-event', { message: 'Only player1 (host) can start the game.' });
                return;
            }

            let room = await getGameRoom(db, gameId);
            if (!room) { socket.emit('error-event', { message: 'Game room not found.' }); return; }
            if (room.status !== 'READY_TO_START') {
                socket.emit('error-event', { message: `Game is not ready to start. Current status: ${room.status}` });
                return;
            }
            if (!room.players) { socket.emit('error-event', { message: 'Player data missing.' }); return; }

            const activePlayers = Object.values(room.players).filter(p => p.socketId && p.isReady && p.hasSetSecret);
            if (activePlayers.length !== room.playerCount) {
                 socket.emit('error-event', { message: 'Not all players are ready or connected.' });
                 const revertedRoom = await updateGameRoom(db, gameId, {$set: { status: 'WAITING_FOR_READY'}});
                 if(revertedRoom) io.to(gameId).emit('game-state-update', revertedRoom);
                 return;
            }
            
            const playerIds = Object.keys(room.players).filter(pid => room.players[pid]?.socketId); 
            if (playerIds.length !== 2) { 
                socket.emit('error-event', {message: 'Target mapping only supported for 2 players currently.'});
                return;
            }
            
            const startingPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
            const targetMap: { [playerId: string]: string } = {};
            targetMap[playerIds[0]] = playerIds[1];
            targetMap[playerIds[1]] = playerIds[0];

            const startGameUpdates = {
                $set: {
                    status: 'IN_PROGRESS' as MultiplayerGameStatus,
                    turn: startingPlayer,
                    targetMap: targetMap,
                    inProgressSince: new Date(),
                }
            };
            const startedRoom = await updateGameRoom(db, gameId, startGameUpdates);

            if (startedRoom) {
                console.log(`[SocketIO] Game ${gameId} starting by host ${socket.playerId}. Turn: ${startingPlayer}, TargetMap: ${JSON.stringify(targetMap)}`);
                io.to(gameId).emit('game-start', { gameId, startingPlayer, targetMap });
                io.to(gameId).emit('game-state-update', startedRoom); 
                if (startedRoom.status === 'IN_PROGRESS' && startedRoom.turn) {
                    startTurnTimer(gameId, startedRoom.turn, io);
                }
            } else {
                socket.emit('error-event', { message: 'Failed to start game server-side.' });
                console.error(`[SocketIO-DB] Failed to update room ${gameId} to IN_PROGRESS.`);
                 const currentRoomState = await getGameRoom(db, gameId);
                 if(currentRoomState) io.to(gameId).emit('game-state-update', currentRoomState);
            }
        });

        socket.on('make-guess', async (data: { gameId: string; playerId: string; guess: string[] }) => {
            const { gameId, playerId: clientPlayerId, guess: guessArray } = data;
        
            if (socket.playerId !== clientPlayerId) {
                socket.emit('error-event', { message: 'Player ID mismatch for guess.' }); return;
            }
        
            let room = await getGameRoom(db, gameId);
            if (!room || !room.players || !room.targetMap) { socket.emit('error-event', { message: 'Game room or critical data not found for guess.' }); return; }
            if (room.status !== 'IN_PROGRESS') { socket.emit('error-event', { message: 'Game is not in progress.' }); return; }
            if (room.turn !== socket.playerId) { socket.emit('error-event', { message: 'Not your turn.' }); return; }
        
            const targetPlayerId = room.targetMap[socket.playerId!];
            if(!targetPlayerId) { socket.emit('error-event', { message: 'Target player not found.'}); return; }

            const targetPlayer = room.players[targetPlayerId];
            if (!targetPlayer || !targetPlayer.secret || targetPlayer.secret.length === 0) {
                socket.emit('error-event', { message: 'Opponent secret not set.' }); return;
            }
            if (guessArray.length !== CODE_LENGTH) { socket.emit('error-event', {message: `Guess must be ${CODE_LENGTH} digits.`}); return; }
        
            clearTurnTimer(gameId); 

            const feedback = calculateFeedback(guessArray, targetPlayer.secret);
            const guessString = guessArray.join('');
            const newGuess: Guess = { value: guessString, feedback };
        
            const playerGuessesPath = `players.${socket.playerId}.guessesMade`;
            const opponentGuessesAgainstPath = `players.${targetPlayerId}.guessesAgainst`;
            
            const updateOps: any = {
                $push: {
                    [playerGuessesPath]: newGuess,
                    [opponentGuessesAgainstPath]: newGuess 
                }
            };
        
            let winner: string | undefined = undefined;
            if (checkWin(feedback)) {
                winner = socket.playerId;
                updateOps.$set = { status: 'GAME_OVER' as MultiplayerGameStatus, winner: winner, turn: undefined };
                console.log(`[SocketIO] Game ${gameId}: Player ${winner} has won!`);
            } else {
                updateOps.$set = { turn: targetPlayerId };
            }
        
            const updatedRoom = await updateGameRoom(db, gameId, updateOps);
            if (!updatedRoom) { 
                socket.emit('error-event', { message: 'Failed to record guess.' }); 
                const currentRoomState = await getGameRoom(db, gameId);
                if(currentRoomState) io.to(gameId).emit('game-state-update', currentRoomState);
                return;
            }
        
            io.to(gameId).emit('guess-feedback', { 
                gameId, 
                guessingPlayerId: socket.playerId!, 
                targetPlayerId, 
                guess: newGuess 
            });
            
            if (winner) {
                io.to(gameId).emit('game-over', { gameId, winner });
            } else if (updatedRoom.turn) { // Ensure turn is defined before starting timer
                const turnUpdateData: TurnUpdateData = { gameId, nextPlayerId: updatedRoom.turn, reason: 'guess' };
                io.to(gameId).emit('turn-update', turnUpdateData);
                if (updatedRoom.status === 'IN_PROGRESS') { // Redundant check, but safe
                     startTurnTimer(gameId, updatedRoom.turn, io);
                }
            }
            io.to(gameId).emit('game-state-update', updatedRoom); 
        });

        socket.on('player-exit', async (data: {gameId: string, playerId: string}) => {
            const { gameId, playerId } = data;
            if(socket.playerId !== playerId) {
                socket.emit('error-event', {message: 'Player ID mismatch on exit.'});
                return;
            }
            console.log(`[SocketIO] Player ${playerId} exiting game ${gameId}`);
            let room = await getGameRoom(db, gameId);
            if (!room || !room.players || !room.players[playerId]) {
                console.warn(`[SocketIO] Player Exit: Room ${gameId} or player ${playerId} not found.`);
                socket.emit('error-event', {message: 'Game or player not found on exit.'});
                return;
            }

            clearTurnTimer(gameId); 
            
            const updateOps: any = { $set: { [`players.${playerId}.socketId`]: undefined }};
            let gameEndedByExit = false;

            if (room.status === 'IN_PROGRESS' && room.playerCount === 2) {
                const otherPlayerId = Object.keys(room.players).find(pId => pId !== playerId && room.players[pId!]?.socketId);
                if(otherPlayerId) {
                    console.log(`[SocketIO] Game ${gameId}: Player ${playerId} exited an active 2-player game. ${otherPlayerId} wins by default.`);
                    updateOps.$set.status = 'GAME_OVER';
                    updateOps.$set.winner = otherPlayerId;
                    updateOps.$set.turn = undefined;
                    gameEndedByExit = true;
                } else {
                     console.log(`[SocketIO] Game ${gameId}: Player ${playerId} exited, but no other active player found. Game ending.`);
                     updateOps.$set.status = 'GAME_OVER';
                     updateOps.$set.winner = undefined; 
                     updateOps.$set.turn = undefined;
                     gameEndedByExit = true;
                }
            } else if (room.status !== 'GAME_OVER' && room.status !== 'IN_PROGRESS') { 
                 updateOps.$set[`players.${playerId}.isReady`] = false;
                 updateOps.$set[`players.${playerId}.hasSetSecret`] = false;
                 // Determine new room status if not game over by exit
                 const activePlayersAfterExit = Object.values(room.players).filter(p => p.socketId && p.socketId !== socket.id);
                 if (activePlayersAfterExit.length < room.playerCount) {
                    updateOps.$set.status = 'WAITING_FOR_PLAYERS';
                 } else {
                    const allRemainingReady = activePlayersAfterExit.every(p => p.isReady);
                    updateOps.$set.status = allRemainingReady ? 'READY_TO_START' : 'WAITING_FOR_READY';
                 }
            }
            
            const updatedRoom = await updateGameRoom(db, gameId, updateOps);
            if (updatedRoom) {
                io.to(gameId).emit('game-state-update', updatedRoom);
                if(gameEndedByExit && updatedRoom.winner) {
                    io.to(gameId).emit('game-over', {gameId, winner: updatedRoom.winner});
                } else if (gameEndedByExit && updatedRoom.status === 'GAME_OVER' && !updatedRoom.winner){
                     io.to(gameId).emit('game-over', {gameId, winner: 'none'});
                }
            } else {
                const currentRoomState = await getGameRoom(db, gameId);
                if(currentRoomState) io.to(gameId).emit('game-state-update', currentRoomState);
            }
            socket.disconnect(true); 
        });

      });
    } else {
        // console.log("[SocketIO] Socket.IO server already initialized. Subsequent POST request ignored.");
    }
  } else if (req.method === 'GET' && res.socket.server.io) {
    // Let Socket.IO handle its own GET requests for polling etc.
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  res.end();
}
