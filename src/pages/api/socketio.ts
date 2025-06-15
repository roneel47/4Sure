
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameRoom, PlayerData, Guess, MultiplayerGameStatus } from '@/types/game';
import { calculateFeedback, checkWin } from '@/lib/gameLogic';
import { MongoClient, Db as MongoDb, FindOneAndUpdateOptions, MongoError, ObjectId } from 'mongodb';

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

let db: MongoDb | null = null;
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
    
    // Ensure indexes (optional: can be done manually in MongoDB Atlas/shell)
    // await connectedDb.collection(COLLECTION_NAME).createIndex({ gameId: 1 }, { unique: true });
    // await connectedDb.collection(COLLECTION_NAME).createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 * 24 }); // 24-hour TTL

    return connectedDb;
  } catch (error) {
    console.error("[SocketIO] Error connecting to MongoDB:", error);
    return null;
  }
})();

async function getGameRoom(gameId: string): Promise<GameRoom | null> {
  const currentDb = await dbConnectionPromise;
  if (!currentDb) return null;
  try {
    // Find by gameId, excluding MongoDB's _id field from the returned document
    const roomDocument = await currentDb.collection(COLLECTION_NAME).findOne({ gameId: gameId }, { projection: { _id: 0 } });
    return roomDocument as GameRoom | null;
  } catch (error) {
    console.error(`[SocketIO-DB] getGameRoom: Error fetching game room ${gameId}:`, error);
    return null;
  }
}

async function createGameRoom(gameId: string, playerCount: number, hostSocketId: string): Promise<GameRoom | null> {
    const currentDb = await dbConnectionPromise;
    if (!currentDb) return null;
    
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
        createdAt: new Date(), // For TTL index
    };

    try {
      const result = await currentDb.collection<Omit<GameRoom, '_id'>>(COLLECTION_NAME).insertOne(roomToInsert);
      if (result.insertedId) {
        console.log(`[SocketIO-DB] Game room ${gameId} created successfully by host ${hostSocketId}.`);
        return roomToInsert; // Return the inserted object (without _id as per GameRoom type)
      }
      return null;
    } catch (error: any) {
      if (error instanceof MongoError && error.code === 11000) { 
        console.warn(`[SocketIO-DB] createGameRoom: ${gameId} already exists. Attempting to fetch.`);
        return getGameRoom(gameId); // Try to fetch existing if duplicate key error
      }
      console.error(`[SocketIO-DB] createGameRoom: Error creating game room ${gameId}:`, error);
      return null;
    }
}

async function updateGameRoom(gameId: string, updateOperators: any): Promise<GameRoom | null> {
  const currentDb = await dbConnectionPromise;
  if (!currentDb) return null;

  const filter = { gameId: gameId };
  // Ensure projection excludes _id if it's not part of GameRoom type
  const options: FindOneAndUpdateOptions = { returnDocument: 'after', upsert: false, projection: { _id: 0 } };

  try {
    const result = await currentDb.collection<GameRoom>(COLLECTION_NAME).findOneAndUpdate(filter, updateOperators, options);
    return result as GameRoom | null; 
  } catch (error: any) {
    console.error(`[SocketIO-DB] updateGameRoom: Error for ${gameId}. Update: ${JSON.stringify(updateOperators)}, Error:`, error);
    return null;
  }
}

const getPlayerCountNumber = (playerCountString: string | null): number => {
  if (playerCountString === 'duo') return 2;
  if (playerCountString === 'trio') return 3;
  if (playerCountString === 'quads') return 4;
  return 0; 
};


export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method === 'POST') { // This POST is only to ensure the server-side setup runs once.
    if (!res.socket.server.io) {
      console.log('[SocketIO] Initializing Socket.IO server...');
      const io = new SocketIOServer(res.socket.server, {
        path: '/api/socketio_c',
        addTrailingSlash: false,
        transports: ['websocket'] 
      });
      res.socket.server.io = io;

      db = await dbConnectionPromise; 

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
              let room = await getGameRoom(gameId);
              if (!room || !room.players || !room.players[playerId]) {
                  console.warn(`[SocketIO] Disconnect ${socket.id}: Room ${gameId} or player ${playerId} not found for disconnect processing.`);
                  return;
              }

              const updateOps: any = { 
                  $set: { 
                      [`players.${playerId}.socketId`]: undefined,
                      // If game wasn't in progress, reset readiness. If it was, keep secret for potential rejoin to game over screen?
                      // For now, always reset readiness if game not over.
                      [`players.${playerId}.isReady`]: room.status === 'IN_PROGRESS' || room.status === 'GAME_OVER' ? room.players[playerId].isReady : false,
                      // Keep hasSetSecret true if they did set it.
                  } 
              };
              
              let updatedRoom = await updateGameRoom(gameId, updateOps);
              if (!updatedRoom) {
                  console.warn(`[SocketIO] Disconnect ${socket.id}: Failed to update room ${gameId} for player ${playerId}. Fetching last known state.`);
                  updatedRoom = await getGameRoom(gameId); // Fetch again to be sure
                  if(!updatedRoom) return; // If still not found, nothing more to do
              }
               
              const activePlayersWithSocketId = Object.values(updatedRoom.players).filter(p => p.socketId);
              
              if (updatedRoom.status !== 'IN_PROGRESS' && updatedRoom.status !== 'GAME_OVER') {
                  if (activePlayersWithSocketId.length < updatedRoom.playerCount) {
                      updatedRoom.status = 'WAITING_FOR_PLAYERS';
                  } else { 
                      const allActivePlayersReady = activePlayersWithSocketId.every(p => p.isReady);
                      updatedRoom.status = allActivePlayersReady ? 'READY_TO_START' : 'WAITING_FOR_READY';
                  }
                  const statusUpdate = await updateGameRoom(gameId, {$set: {status: updatedRoom.status}});
                  if (statusUpdate) updatedRoom = statusUpdate; else updatedRoom = await getGameRoom(gameId);
              }
              else if (updatedRoom.status === 'IN_PROGRESS' && updatedRoom.playerCount > 0 && activePlayersWithSocketId.length < updatedRoom.playerCount) {
                  // Simplified: if one player disconnects from a 2-player game, the other wins.
                  // For >2 players, more complex logic needed (e.g. game continues or ends based on rules)
                  const winnerId = activePlayersWithSocketId[0] ? Object.keys(updatedRoom.players).find(pId => updatedRoom!.players[pId]?.socketId === activePlayersWithSocketId[0].socketId) : undefined;
                  if(winnerId && updatedRoom.playerCount === 2){ // Only auto-end for duo for now
                      console.log(`[SocketIO] Game ${gameId}: Player ${playerId} disconnected during active game. ${winnerId} wins by default.`);
                      const finalRoomState = await updateGameRoom(gameId, {$set: {status: 'GAME_OVER', winner: winnerId, turn: undefined}});
                      if (finalRoomState) {
                          io.to(gameId).emit('game-over', {gameId, winner: winnerId});
                          updatedRoom = finalRoomState;
                      } else {
                          updatedRoom = await getGameRoom(gameId);
                      }
                  }
              }
              
              if(updatedRoom) io.to(gameId).emit('game-state-update', updatedRoom); 
            }
          });

          socket.on('join-game', async (data: { gameId: string; playerCount: string; isHost?: boolean; rejoiningPlayerId?: string }) => {
              const { gameId, playerCount: playerCountString, isHost, rejoiningPlayerId } = data;
              console.log(`[SocketIO] Socket ${socket.id} joining game: ${gameId}. isHost: ${isHost}, rejoiningAs: ${rejoiningPlayerId}`);

              const numPlayerCount = getPlayerCountNumber(playerCountString);
              if (!numPlayerCount) {
                socket.emit('error-event', { message: 'Invalid player count.' }); return;
              }

              let room = await getGameRoom(gameId);
              let assignedPlayerId: string | undefined = undefined;
              let isNewPlayer = false;

              if (!room) {
                  if (isHost) {
                      console.log(`[SocketIO] Game ${gameId}: Creating room as host ${socket.id}.`);
                      room = await createGameRoom(gameId, numPlayerCount, socket.id);
                      if (!room) { socket.emit('error-event', { message: 'Failed to create room.' }); return; }
                      assignedPlayerId = "player1";
                      isNewPlayer = true; // First player in a new room
                  } else {
                      socket.emit('error-event', { message: 'Room not found.' }); return;
                  }
              } else { 
                  if (rejoiningPlayerId && room.players[rejoiningPlayerId]) {
                      const playerSlot = room.players[rejoiningPlayerId];
                      if (playerSlot.socketId && playerSlot.socketId !== socket.id) {
                           socket.emit('error-event', { message: `Slot ${rejoiningPlayerId} is currently active with another session.` }); return;
                      }
                      console.log(`[SocketIO] Game ${gameId}: Player ${rejoiningPlayerId} (${socket.id}) rejoining.`);
                      assignedPlayerId = rejoiningPlayerId;
                      // Preserve existing player data, just update socketId
                      room.players[rejoiningPlayerId].socketId = socket.id; 
                  } else {
                      let foundSlot = false;
                      for (let i = 1; i <= room.playerCount; i++) {
                          const potentialPlayerId = `player${i}`;
                          if (!room.players[potentialPlayerId] || !room.players[potentialPlayerId].socketId) {
                              assignedPlayerId = potentialPlayerId;
                              room.players[assignedPlayerId] = { 
                                  socketId: socket.id, 
                                  secret: [], 
                                  guessesMade: [], 
                                  guessesAgainst: [], 
                                  hasSetSecret: false, 
                                  isReady: false 
                              };
                              console.log(`[SocketIO] Game ${gameId}: New player ${assignedPlayerId} (${socket.id}) assigned.`);
                              isNewPlayer = true;
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
              await socket.join(gameId); // Make sure join is awaited or handled if it's async in some lib versions
              socket.emit('player-assigned', { playerId: assignedPlayerId, gameId });

              const activePlayersWithSocketId = Object.values(room.players).filter(p => p.socketId);
              if (activePlayersWithSocketId.length === room.playerCount && room.status === 'WAITING_FOR_PLAYERS') {
                  room.status = 'WAITING_FOR_READY';
              } else if (activePlayersWithSocketId.length < room.playerCount && room.status !== 'GAME_OVER') {
                   room.status = 'WAITING_FOR_PLAYERS'; 
              } else if (room.status === 'WAITING_FOR_READY') {
                  // If room was waiting for ready, and a player reconnected, check if now ready to start
                  const allActivePlayersReady = activePlayersWithSocketId.every(p => p.isReady);
                  if (allActivePlayersReady && activePlayersWithSocketId.length === room.playerCount) {
                      room.status = 'READY_TO_START';
                  }
              }
              
              const finalRoomState = await updateGameRoom(gameId, { $set: { players: room.players, status: room.status } });
              if (!finalRoomState) { 
                  console.error(`[SocketIO-DB] Critical: Failed to save final room state for ${gameId} after join. Player: ${assignedPlayerId}`);
                  socket.emit('error-event', { message: 'Server error saving game state.' });
                  const fetchedRoom = await getGameRoom(gameId); // Attempt to get current state
                  if (fetchedRoom) io.to(gameId).emit('game-state-update', fetchedRoom);
                  return;
              }
              
              io.to(gameId).emit('game-state-update', finalRoomState);
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
            
            let room = await getGameRoom(gameId);
            if (!room) {
                socket.emit('error-event', { message: 'Game room not found.' });
                return;
            }
            if (!room.players || !room.players[socket.playerId!]) {
                socket.emit('error-event', { message: 'Player not found in room.' });
                return;
            }
        
            const playerUpdatePath = `players.${socket.playerId}`;
            const updateOps = {
                $set: {
                    [`${playerUpdatePath}.secret`]: secret,
                    [`${playerUpdatePath}.hasSetSecret`]: true,
                    [`${playerUpdatePath}.isReady`]: true,
                }
            };
        
            let updatedRoom = await updateGameRoom(gameId, updateOps);
            if (!updatedRoom) {
                socket.emit('error-event', { message: 'Failed to save secret.' });
                console.error(`[SocketIO-DB] Failed to update room ${gameId} after secret submission for ${socket.playerId}.`);
                return;
            }
            
            io.to(gameId).emit('game-state-update', updatedRoom); // Notify all players of the updated state (e.g., player is ready)
        
            // Check if all active players are ready
            const activePlayers = Object.values(updatedRoom.players).filter(p => p.socketId);
            const allActivePlayersReady = activePlayers.length === updatedRoom.playerCount && activePlayers.every(p => p.isReady);
        
            if (allActivePlayersReady) {
                console.log(`[SocketIO] Game ${gameId}: All ${updatedRoom.playerCount} players are ready. Status changing to READY_TO_START.`);
                const finalRoomState = await updateGameRoom(gameId, { $set: { status: 'READY_TO_START' } });
                if (finalRoomState) {
                    io.to(gameId).emit('game-state-update', finalRoomState);
                } else {
                     console.error(`[SocketIO-DB] Failed to update room ${gameId} to READY_TO_START.`);
                     // Attempt to refetch and send, or handle error
                     const currentRoomState = await getGameRoom(gameId);
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

            let room = await getGameRoom(gameId);
            if (!room) {
                socket.emit('error-event', { message: 'Game room not found.' });
                return;
            }
            if (room.status !== 'READY_TO_START') {
                socket.emit('error-event', { message: `Game is not ready to start. Current status: ${room.status}` });
                return;
            }

            // Double check all players are still connected and ready
            const activePlayers = Object.values(room.players).filter(p => p.socketId && p.isReady);
            if (activePlayers.length !== room.playerCount) {
                 socket.emit('error-event', { message: 'Not all players are ready or connected.' });
                 // Optionally revert status to WAITING_FOR_READY if needed
                 const revertedRoom = await updateGameRoom(gameId, {$set: { status: 'WAITING_FOR_READY'}});
                 if(revertedRoom) io.to(gameId).emit('game-state-update', revertedRoom);
                 return;
            }

            // Determine turn and targetMap (simple for 2 players)
            const playerIds = Object.keys(room.players).filter(pid => room!.players[pid].socketId); // Get active player IDs
            if (playerIds.length !== 2) { // Assuming duo mode for now
                socket.emit('error-event', {message: 'Target mapping only supported for 2 players currently.'});
                return;
            }
            
            const startingPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
            const targetMap: { [playerId: string]: string } = {};
            targetMap[playerIds[0]] = playerIds[1];
            targetMap[playerIds[1]] = playerIds[0];

            const startGameUpdates = {
                $set: {
                    status: 'IN_PROGRESS',
                    turn: startingPlayer,
                    targetMap: targetMap,
                }
            };
            const startedRoom = await updateGameRoom(gameId, startGameUpdates);

            if (startedRoom) {
                console.log(`[SocketIO] Game ${gameId} starting by host ${socket.playerId}. Turn: ${startingPlayer}, TargetMap: ${JSON.stringify(targetMap)}`);
                io.to(gameId).emit('game-start', { gameId, startingPlayer, targetMap });
                io.to(gameId).emit('game-state-update', startedRoom); // ensure final state is sent
            } else {
                socket.emit('error-event', { message: 'Failed to start game server-side.' });
                console.error(`[SocketIO-DB] Failed to update room ${gameId} to IN_PROGRESS.`);
            }
        });

        socket.on('make-guess', async (data: { gameId: string; playerId: string; guess: string[] }) => {
            const { gameId, playerId: clientPlayerId, guess: guessArray } = data;
        
            if (socket.playerId !== clientPlayerId) {
                console.warn(`[SocketIO] Security Alert: Socket ${socket.id} (server-assigned: ${socket.playerId}) ` +
                             `tried to make guess using client-provided ID ${clientPlayerId} in game ${gameId}. Denying.`);
                socket.emit('error-event', { message: 'Player ID mismatch for guess.' });
                return;
            }
        
            let room = await getGameRoom(gameId);
            if (!room) {
                socket.emit('error-event', { message: 'Game room not found for guess.' });
                return;
            }
            if (room.status !== 'IN_PROGRESS') {
                socket.emit('error-event', { message: 'Game is not in progress.' });
                return;
            }
            if (room.turn !== socket.playerId) {
                socket.emit('error-event', { message: 'Not your turn.' });
                return;
            }
            if (!room.targetMap || !room.players) {
                socket.emit('error-event', { message: 'Game configuration error (targetMap or players missing).' });
                console.error(`[SocketIO] Game ${gameId}: targetMap or players missing for guess processing.`);
                return;
            }
        
            const targetPlayerId = room.targetMap[socket.playerId!];
            const targetPlayer = room.players[targetPlayerId];
        
            if (!targetPlayer || !targetPlayer.secret || targetPlayer.secret.length === 0) {
                socket.emit('error-event', { message: 'Opponent secret not set.' });
                console.error(`[SocketIO] Game ${gameId}: Target player ${targetPlayerId} or their secret not found.`);
                return;
            }
        
            const feedback = calculateFeedback(guessArray, targetPlayer.secret);
            const guessString = guessArray.join('');
            const newGuess: Guess = { value: guessString, feedback };
        
            const playerGuessesPath = `players.${socket.playerId}.guessesMade`;
            const opponentGuessesAgainstPath = `players.${targetPlayerId}.guessesAgainst`;
            
            const updateOps: any = {
                $push: {
                    [playerGuessesPath]: newGuess,
                    [opponentGuessesAgainstPath]: newGuess // Record guess against opponent
                }
            };
        
            let winner: string | undefined = undefined;
            if (checkWin(feedback)) {
                winner = socket.playerId;
                updateOps.$set = {
                    status: 'GAME_OVER',
                    winner: winner,
                    turn: undefined, // No more turns
                };
                console.log(`[SocketIO] Game ${gameId}: Player ${winner} has won!`);
            } else {
                // Switch turn
                updateOps.$set = {
                    turn: targetPlayerId, // Next turn is the opponent's
                };
            }
        
            const updatedRoom = await updateGameRoom(gameId, updateOps);
            if (!updatedRoom) {
                socket.emit('error-event', { message: 'Failed to record guess.' });
                console.error(`[SocketIO-DB] Failed to update room ${gameId} after guess by ${socket.playerId}.`);
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
            } else {
                io.to(gameId).emit('turn-update', { gameId, nextPlayerId: targetPlayerId });
            }
            io.to(gameId).emit('game-state-update', updatedRoom); // Send full state update
        });


      });
    } else {
    //   console.log("[SocketIO] Socket.IO server already running.");
    }
  }
  res.end();
}
