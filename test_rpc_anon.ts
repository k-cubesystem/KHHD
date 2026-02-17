import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ukuscwvkkbedszwmetfu.supabase.co'
const supabaseAnonKey = 'sb_publishable_mBWq7AicUS5GToQJxHm4ug_MLFF0MF5'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRpc() {
  console.log('Testing RPC with ANON key...')
  const { data, error } = await supabase.rpc('get_shared_analysis_record', {
    token_input: 'f196cf78-29eb-490a-b66c-129108ef9d67',
  })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success! Data:', data)
  }
}

testRpc()
