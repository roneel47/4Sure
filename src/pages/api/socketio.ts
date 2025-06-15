
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameRoom, PlayerData, Guess, MultiplayerGameStatus } from '@/types/game';
import { calculateFeedback, checkWin } from '@/lib/gameLogic'; // Assuming these are still needed later
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
    const roomDocument = await currentDb.collection<GameRoom>(COLLECTION_NAME).findOne({ gameId: gameId });
    if (roomDocument) {
        const { _id, ...data } = roomDocument; // Exclude MongoDB's _id
        return data as GameRoom;
    }
    return null;
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

    const newRoomData: GameRoom = {
        gameId,
        playerCount,
        players: { "player1": initialPlayerData },
        status: 'WAITING_FOR_PLAYERS',
        targetMap: {},
        createdAt: new Date(),
    };

    try {
      const result = await currentDb.collection<GameRoom>(COLLECTION_NAME).insertOne(newRoomData);
      if (result.insertedId) {
        console.log(`[SocketIO-DB] Game room ${gameId} created successfully by host ${hostSocketId}.`);
        const { _id, ...data } = newRoomData;
        return data as GameRoom;
      }
      return null;
    } catch (error: any) {
      if (error instanceof MongoError && error.code === 11000) { 
        console.warn(`[SocketIO-DB] createGameRoom: ${gameId} already exists.`);
        return getGameRoom(gameId);
      }
      console.error(`[SocketIO-DB] createGameRoom: Error creating game room ${gameId}:`, error);
      return null;
    }
}

async function updateGameRoom(gameId: string, updateOperators: any): Promise<GameRoom | null> {
  const currentDb = await dbConnectionPromise;
  if (!currentDb) return null;

  const filter = { gameId: gameId };
  const options: FindOneAndUpdateOptions = { returnDocument: 'after', upsert: false };

  try {
    const result = await currentDb.collection<GameRoom>(COLLECTION_NAME).findOneAndUpdate(filter, updateOperators, options);
    if (result) {
        const { _id, ...roomData } = result; 
        return roomData as GameRoom;
    }
    return null; 
  } catch (error: any) {
    console.error(`[SocketIO-DB] updateGameRoom: Error for ${gameId}. Update: ${JSON.stringify(updateOperators)}, Error:`, error);
    return null;
  }
}

const getPlayerCountNumber = (playerCountString: string | null): number => {
  if (playerCountString === 'duo') return 2;
  if (playerCountString === 'trio') return 3; // Placeholder for future
  if (playerCountString === 'quads') return 4; // Placeholder for future
  return 0; 
};


export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method === 'POST') { /* For initial handshake if needed */ }

  if (!res.socket.server.io) {
    console.log('[SocketIO] Initializing Socket.IO server...');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio_c',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    db = await dbConnectionPromise; // Ensure DB is resolved

    io.on('connection', (socket: CustomSocket) => {
        if (!db) {
          console.error(`[SocketIO] Connection ${socket.id}: DB instance is null. Disconnecting.`);
          socket.emit('error-event', { message: 'Server database error.' });
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
                    [`players.${playerId}.isReady`]: false, // Player is no longer ready
                    // Don't reset hasSetSecret, they might rejoin and want their secret kept
                } 
            };
            
            room = await updateGameRoom(gameId, updateOps);
            if (!room) {
                console.warn(`[SocketIO] Disconnect ${socket.id}: Failed to update room ${gameId} for player ${playerId}.`);
                return; // Or try to fetch again
            }
             
            // Determine new room status
            const activePlayers = Object.values(room.players).filter(p => p.socketId);
            if (room.status !== 'IN_PROGRESS' && room.status !== 'GAME_OVER') {
                 if (activePlayers.length < room.playerCount) {
                    room.status = 'WAITING_FOR_PLAYERS';
                } else { // Room still full, check if all ready
                    const allActiveReady = activePlayers.every(p => p.isReady);
                    room.status = allActiveReady ? 'READY_TO_START' : 'WAITING_FOR_READY';
                }
                const statusUpdate = await updateGameRoom(gameId, {$set: {status: room.status}});
                if(statusUpdate) room = statusUpdate;
            }
            // Handle game over if in progress and player disconnects (simplified for duo)
            else if (room.status === 'IN_PROGRESS' && room.playerCount === 2 && activePlayers.length < 2) {
                const winnerId = activePlayers[0] ? Object.keys(room.players).find(pId => room.players[pId]?.socketId === activePlayers[0].socketId) : undefined;
                if(winnerId){
                    console.log(`[SocketIO] Game ${gameId}: Player ${playerId} disconnected. ${winnerId} wins.`);
                    const finalRoom = await updateGameRoom(gameId, {$set: {status: 'GAME_OVER', winner: winnerId, turn: undefined}});
                    if (finalRoom) {
                        io.to(gameId).emit('game-over', {gameId, winner: winnerId});
                        room = finalRoom;
                    }
                }
            }
            
            io.to(gameId).emit('game-state-update', room); 
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

            if (!room) { // Room doesn't exist
                if (isHost) {
                    console.log(`[SocketIO] Game ${gameId}: Creating room as host ${socket.id}.`);
                    room = await createGameRoom(gameId, numPlayerCount, socket.id);
                    if (!room) { socket.emit('error-event', { message: 'Failed to create room.' }); return; }
                    assignedPlayerId = "player1";
                } else {
                    socket.emit('error-event', { message: 'Room not found.' }); return;
                }
            } else { // Room exists
                if (rejoiningPlayerId && room.players[rejoiningPlayerId]) {
                    const playerSlot = room.players[rejoiningPlayerId];
                    if (playerSlot.socketId && playerSlot.socketId !== socket.id) {
                         socket.emit('error-event', { message: `Slot ${rejoiningPlayerId} already active.` }); return;
                    }
                    console.log(`[SocketIO] Game ${gameId}: Player ${rejoiningPlayerId} (${socket.id}) rejoining.`);
                    assignedPlayerId = rejoiningPlayerId;
                    room.players[rejoiningPlayerId].socketId = socket.id;
                    // isReady and hasSetSecret are preserved for rejoining players unless game logic dictates reset
                } else {
                    // Find next available slot
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
                            break;
                        }
                    }
                    if (!assignedPlayerId) {
                        socket.emit('error-event', { message: 'Room is full.' }); return;
                    }
                }
            }

            if (!assignedPlayerId || !room) {
                socket.emit('error-event', { message: 'Failed to assign player to room.' }); return;
            }
            
            socket.playerId = assignedPlayerId;
            socket.gameId = gameId;
            socket.join(gameId);
            socket.emit('player-assigned', { playerId: assignedPlayerId, gameId });

            // Update room status based on player count
            const activePlayers = Object.values(room.players).filter(p => p.socketId);
            if (activePlayers.length === room.playerCount && room.status === 'WAITING_FOR_PLAYERS') {
                room.status = 'WAITING_FOR_READY';
            } else if (activePlayers.length < room.playerCount) {
                 room.status = 'WAITING_FOR_PLAYERS'; // Could happen if someone joined then quickly left
            }
            
            // Persist changes to DB
            const finalRoomState = await updateGameRoom(gameId, { $set: { players: room.players, status: room.status } });
            if (!finalRoomState) { 
                console.error(`[SocketIO-DB] Critical: Failed to save final room state for ${gameId} after join.`);
                socket.emit('error-event', { message: 'Server error saving game state.' });
                // Potentially try to fetch the room again or rollback
                const fetchedRoom = await getGameRoom(gameId);
                if (fetchedRoom) io.to(gameId).emit('game-state-update', fetchedRoom);
                return;
            }
            
            io.to(gameId).emit('game-state-update', finalRoomState);
        });

        // Placeholder for 'send-secret'
        socket.on('send-secret', (data) => {
            console.log(`[SocketIO] Received 'send-secret' (not implemented yet):`, data);
            // TODO: Implement secret handling, update player ready status, check if game can start
        });

        // Placeholder for 'request-start-game'
        socket.on('request-start-game', (data) => {
            console.log(`[SocketIO] Received 'request-start-game' (not implemented yet):`, data);
            // TODO: Implement game start logic, only by player1, set turn, targetMap
        });

        // Placeholder for 'make-guess'
        socket.on('make-guess', (data) => {
            console.log(`[SocketIO] Received 'make-guess' (not implemented yet):`, data);
            // TODO: Implement guess logic, feedback, win condition, turn update
        });

    });
  } else {
    // console.log("[SocketIO] Socket.IO server already running.");
  }
  res.end();
}
