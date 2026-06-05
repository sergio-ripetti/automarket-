import http from 'http'

function testRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5173${path}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          hasContent: data.length > 0,
        })
      })
    }).on('error', (e) => {
      resolve({ error: e.message })
    })
  })
}

async function run() {
  console.log('Testing Sales Module routes...')
  const routes = [
    '/admin/sales',
    '/admin/sales/new',
  ]

  for (const route of routes) {
    const result = await testRoute(route)
    console.log(`${route}: ${result.status || 'ERROR'} ${result.hasContent ? '✓' : '✗'}`)
  }
}

run()
