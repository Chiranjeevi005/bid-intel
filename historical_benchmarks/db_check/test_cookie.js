const { createServerClient } = require('@supabase/ssr');

const cookies = {};
const client = createServerClient('http://localhost', 'anon', {
  cookies: {
    getAll() { return []; },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => {
        cookies[name] = value;
      });
    }
  }
});

async function test() {
  await client.auth.setSession({
    access_token: 'fake_access',
    refresh_token: 'fake_refresh'
  });
  console.log(cookies);
}
test();
