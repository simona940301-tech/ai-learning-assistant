import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'
import { z } from 'zod'

/**
 * POST /api/play/battle/update-elo
 * 
 * Update Elo rankings after battle completion
 * Called by Rust battle server (authoritative source)
 * 
 * Request body:
 * {
 *   matchId: string
 *   player1Id: string
 *   player2Id: string
 *   player1EloDiff: number
 *   player2EloDiff: number
 *   player1Score: number
 *   player2Score: number
 *   winner: string | null
 * }
 */
const UpdateEloRequestSchema = z.object({
  matchId: z.string().uuid(),
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  player1Score: z.number().int(),
  player2Score: z.number().int(),
  winner: z.string().uuid().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)

    // Parse and validate request
    const body = await req.json()
    const validated = UpdateEloRequestSchema.parse(body)

    // Get current Elo rankings
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, elo_rank, coins')
      .in('id', [validated.player1Id, validated.player2Id])

    if (profilesError || !profiles || profiles.length !== 2) {
      console.error('[Update Elo] Profile fetch error:', profilesError)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'One or both players not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    const player1Profile = profiles.find(p => p.id === validated.player1Id)
    const player2Profile = profiles.find(p => p.id === validated.player2Id)

    if (!player1Profile || !player2Profile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'Player profiles not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Get current Elo from database (authoritative source)
    const player1CurrentElo = player1Profile.elo_rank || 1000
    const player2CurrentElo = player2Profile.elo_rank || 1000
    
    // Calculate Elo changes using standard Elo formula
    const K_FACTOR = 32
    const player1ExpectedScore = 1 / (1 + Math.pow(10, (player2CurrentElo - player1CurrentElo) / 400))
    const player2ExpectedScore = 1 / (1 + Math.pow(10, (player1CurrentElo - player2CurrentElo) / 400))
    
    // Determine actual scores (1.0 = win, 0.5 = draw, 0.0 = loss)
    const player1ActualScore = validated.player1Score > validated.player2Score 
      ? 1.0 
      : validated.player1Score < validated.player2Score 
        ? 0.0 
        : 0.5
    const player2ActualScore = 1.0 - player1ActualScore
    
    // Calculate Elo changes
    const player1EloDiff = Math.round(K_FACTOR * (player1ActualScore - player1ExpectedScore))
    const player2EloDiff = Math.round(K_FACTOR * (player2ActualScore - player2ExpectedScore))
    
    // Calculate new Elo rankings
    const player1NewElo = Math.max(0, player1CurrentElo + player1EloDiff)
    const player2NewElo = Math.max(0, player2CurrentElo + player2EloDiff)

    // Calculate coin rewards (winner gets more)
    const baseCoinReward = 50
    const winnerBonus = 30
    const contractBonus = 0 // TODO: 從 match 記錄中獲取合約金額
    
    const player1Coins = validated.winner === validated.player1Id
      ? baseCoinReward + winnerBonus + contractBonus
      : baseCoinReward + contractBonus
    const player2Coins = validated.winner === validated.player2Id
      ? baseCoinReward + winnerBonus + contractBonus
      : baseCoinReward + contractBonus
    
    // 計算金幣來源細分（用於前端展示）
    const player1CoinBreakdown = {
      base: baseCoinReward,
      winner: validated.winner === validated.player1Id ? winnerBonus : 0,
      contract: contractBonus,
      total: player1Coins,
    }
    const player2CoinBreakdown = {
      base: baseCoinReward,
      winner: validated.winner === validated.player2Id ? winnerBonus : 0,
      contract: contractBonus,
      total: player2Coins,
    }

    // Update both players' Elo and coins
    const updates = [
      supabase
        .from('profiles')
        .update({
          elo_rank: player1NewElo,
          coins: (player1Profile.coins || 0) + player1Coins,
        })
        .eq('id', validated.player1Id),
      supabase
        .from('profiles')
        .update({
          elo_rank: player2NewElo,
          coins: (player2Profile.coins || 0) + player2Coins,
        })
        .eq('id', validated.player2Id),
    ]

    const results = await Promise.all(updates)
    
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('[Update Elo] Update errors:', errors)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to update Elo rankings' },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    // Log battle result (optional: create battle_history table later)
    // For now, just return success

    return NextResponse.json({
      success: true,
      player1: {
        id: validated.player1Id,
        oldElo: player1CurrentElo,
        newElo: player1NewElo,
        eloDiff: player1EloDiff,
        coinsEarned: player1Coins,
        coinBreakdown: player1CoinBreakdown,
      },
      player2: {
        id: validated.player2Id,
        oldElo: player2CurrentElo,
        newElo: player2NewElo,
        eloDiff: player2EloDiff,
        coinsEarned: player2Coins,
        coinBreakdown: player2CoinBreakdown,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request format', details: error.errors },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    console.error('[Update Elo] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
