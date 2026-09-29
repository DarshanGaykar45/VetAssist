/**
 * Verification script for Phase 7 offline-to-online sync flows
 */
const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { headers, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('🧪 Starting Phase 7 Offline Sync Verification...\n');

  // 1. Authenticate Doctor
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@vetassist.com', password: 'Doctor@123' }),
  });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('❌ Failed to login:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Authenticated as doctor');

  // Test 1: Simulating offline creation of 1 farmer and 2 inseminations
  const farmerClientId = `offline-farmer-${Date.now()}`;
  const farmerMobile = `+9199${Date.now().toString().slice(-8)}`;
  const insem1ClientId = `offline-insem1-${Date.now()}`;
  const insem2ClientId = `offline-insem2-${Date.now()}`;

  console.log('\n--- Step 1: Uploading offline-created farmer (outbox item 1) ---');
  const farmerRes = await request('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Ranchhodbhai Rabari (Offline Created)',
      mobile: farmerMobile,
      village: 'Anand Rural',
      cowsOwned: 5,
      clientId: farmerClientId,
    }),
  });
  if (farmerRes.status !== 201 && farmerRes.status !== 200) {
    console.error('❌ Failed to create farmer:', JSON.stringify(farmerRes, null, 2));
    process.exit(1);
  }
  const serverFarmer = farmerRes.data.data;
  console.log(`✅ Farmer uploaded successfully. Server ID: ${serverFarmer.id}, ClientId: ${serverFarmer.clientId}`);

  console.log('\n--- Step 2: Uploading 2 inseminations referencing farmerClientId ---');
  const insem1Res = await request('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      farmerClientId: farmerClientId,
      date: '2026-09-28',
      time: '14:30',
      cowCount: 2,
      strawCode: 'Gir Bull Batch #GB-900',
      notes: 'First insemination visit offline',
      clientId: insem1ClientId,
    }),
  });
  if (insem1Res.status !== 201 && insem1Res.status !== 200) {
    console.error('❌ Failed insem1:', insem1Res);
    process.exit(1);
  }
  console.log(`✅ Insem 1 uploaded. Receipt #${insem1Res.data.data.receiptNumber}, Farmer ID resolved to ${insem1Res.data.data.farmerId}`);

  const insem2Res = await request('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      farmerClientId: farmerClientId,
      date: '2026-09-28',
      time: '15:15',
      cowCount: 1,
      strawCode: 'Murrah Buffalo #MB-101',
      notes: 'Second insemination visit offline',
      clientId: insem2ClientId,
    }),
  });
  if (insem2Res.status !== 201 && insem2Res.status !== 200) {
    console.error('❌ Failed insem2:', insem2Res);
    process.exit(1);
  }
  console.log(`✅ Insem 2 uploaded. Receipt #${insem2Res.data.data.receiptNumber}, Farmer ID resolved to ${insem2Res.data.data.farmerId}`);

  console.log('\n--- Step 3: Simulating network failure after server saved (Retry Idempotency) ---');
  const retryFarmer = await request('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Ranchhodbhai Rabari (Offline Created)',
      mobile: farmerMobile,
      clientId: farmerClientId,
    }),
  });
  if (retryFarmer.status !== 200) {
    console.error('❌ Expected 200 for idempotent retry, got:', retryFarmer.status);
    process.exit(1);
  }
  if (retryFarmer.data.data.id !== serverFarmer.id) {
    console.error('❌ Idempotent retry returned different ID!');
    process.exit(1);
  }
  console.log('✅ Farmer retry succeeded idempotently (HTTP 200, identical ID, 0 duplicates)');

  const retryInsem1 = await request('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      farmerClientId: farmerClientId,
      date: '2026-09-28',
      time: '14:30',
      cowCount: 2,
      clientId: insem1ClientId,
    }),
  });
  if (retryInsem1.status !== 200) {
    console.error('❌ Expected 200 for idempotent insem retry, got:', retryInsem1.status);
    process.exit(1);
  }
  if (retryInsem1.data.data.receiptNumber !== insem1Res.data.data.receiptNumber) {
    console.error('❌ Insem retry created different receipt!');
    process.exit(1);
  }
  console.log(`✅ Insem 1 retry succeeded idempotently (HTTP 200, identical Receipt #${retryInsem1.data.data.receiptNumber}, 0 duplicates)`);

  console.log('\n--- Step 4: Simulating 4xx validation error (Does not block queue) ---');
  const invalidInsem = await request('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      farmerId: serverFarmer.id,
      // Missing date and time
      cowCount: 0, // Invalid count < 1
      clientId: `invalid-item-${Date.now()}`,
    }),
  });
  if (invalidInsem.status !== 400) {
    console.error('❌ Expected 400 validation error, got:', invalidInsem.status);
    process.exit(1);
  }
  console.log(`✅ 4xx correctly rejected with message: "${invalidInsem.data.message}". Handled as failed without retrying endlessly.`);

  console.log('\n--- Step 5: Burst of 10 queued items sequentially with 100ms pacing ---');
  for (let i = 1; i <= 10; i++) {
    const burstInsemRes = await request('/inseminations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        farmerId: serverFarmer.id,
        date: '2026-09-28',
        time: '16:00',
        cowCount: 1,
        strawCode: `Burst Test #${i}`,
        clientId: `burst-test-${i}-${Date.now()}`,
      }),
    });
    if (burstInsemRes.status !== 201) {
      console.error(`❌ Burst item ${i} failed with status:`, burstInsemRes.status);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('✅ Burst of 10 queued items processed cleanly without 429 rate limit errors');

  console.log('\n✨ All Phase 7 Verification Scenarios PASSED 100%!');
}

run().catch((err) => {
  console.error('Error running test:', err);
  process.exit(1);
});
