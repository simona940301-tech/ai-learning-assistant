import { Client } from 'pg'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from apps/web/.env.local
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') })

async function main() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

    const client = new Client({
        connectionString: databaseUrl,
    })

    try {
        await client.connect()
        console.log('Connected to database')

        // 1. Create a test user or use existing mock user
        const testUserId = 'e770f9cd-52a7-43de-b983-70f6f78d2f53' // Mock user ID

        // 2. Set energy to 0 and last updated to 30 minutes ago
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        console.log(`Setting user ${testUserId} energy to 0, last updated at ${thirtyMinutesAgo}`)

        await client.query(`
      UPDATE profiles 
      SET daily_energy = 0, 
          energy_last_updated_at = $1 
      WHERE id = $2
    `, [thirtyMinutesAgo, testUserId])

        // 3. Call calculate_current_energy RPC
        console.log('Calling calculate_current_energy...')
        const res = await client.query(`
      SELECT calculate_current_energy(0, $1::timestamptz, 8, 30) as current_energy
    `, [thirtyMinutesAgo])

        const calculatedEnergy = res.rows[0].current_energy
        console.log(`Calculated energy: ${calculatedEnergy}`)

        if (calculatedEnergy === 1) {
            console.log('✅ Test PASSED: Energy regenerated to 1 after 30 minutes')
        } else {
            console.error(`❌ Test FAILED: Expected 1, got ${calculatedEnergy}`)
            process.exit(1)
        }

        // 4. Test cap (8)
        console.log('Testing cap...')
        const longAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
        const resCap = await client.query(`
      SELECT calculate_current_energy(0, $1::timestamptz, 8, 30) as current_energy
    `, [longAgo])

        const cappedEnergy = resCap.rows[0].current_energy
        console.log(`Calculated energy after 24h: ${cappedEnergy}`)

        if (cappedEnergy === 8) {
            console.log('✅ Test PASSED: Energy capped at 8')
        } else {
            console.error(`❌ Test FAILED: Expected 8, got ${cappedEnergy}`)
            process.exit(1)
        }

    } catch (error) {
        console.error('Test failed:', error)
        process.exit(1)
    } finally {
        await client.end()
    }
}

main()
