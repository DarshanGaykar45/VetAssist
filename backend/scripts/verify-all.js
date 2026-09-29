import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runEndToEndVerification() {
  console.log('🚀 Running Comprehensive VetAssist Verification Suite...\n');

  async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Health check
  console.log('--- 1. Health Check ---');
  const health = await api('/health');
  assert.strictEqual(health.status, 200);
  console.log('✅ Backend health check OK (port 5000)\n');

  // 2. Doctor Login with Seed Credentials
  console.log('--- 2. Doctor Authentication with Seed Credentials ---');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@vetassist.com', password: 'Doctor@123' }),
  });
  assert.strictEqual(loginRes.status, 200);
  assert(loginRes.data.token, 'Token must be returned');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Doctor login successful: doctor@vetassist.com (role: DOCTOR)\n');

  // 3. Section A: Add Farmer Details
  console.log('--- 3. Section A: Add Farmer Details ---');
  const uniqueMobile = `+91 98${Date.now().toString().slice(-8)}`;
  const farmerPayload = {
    name: 'Govindbhai Rabari',
    mobile: uniqueMobile,
    cowsOwned: '4',
    village: 'Mogri, Anand',
    notes: 'Prefers pure Gir bull artificial insemination.',
  };

  const createFarmerRes = await api('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(farmerPayload),
  });
  console.log('Create Farmer response:', createFarmerRes.status, createFarmerRes.data.message);
  assert.strictEqual(createFarmerRes.status, 201);
  assert.strictEqual(createFarmerRes.data.success, true);
  assert(createFarmerRes.data.data.id, 'Farmer ID must exist');
  assert.strictEqual(createFarmerRes.data.data.name, 'Govindbhai Rabari');
  assert.strictEqual(createFarmerRes.data.data.cowsOwned, 4);
  const createdFarmerId = createFarmerRes.data.data.id;
  console.log(`✅ Farmer created successfully. ID: ${createdFarmerId}`);

  // Also test alias field names (phone instead of mobile, farmerName instead of name)
  const aliasMobile = `+91 97${Date.now().toString().slice(-8)}`;
  const aliasFarmerRes = await api('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      farmerName: 'Kishore Patel',
      phone: aliasMobile,
      cattleCount: 2,
      village: 'Karamsad',
    }),
  });
  assert.strictEqual(aliasFarmerRes.status, 201);
  console.log('✅ Alias field tolerance verified: farmerName, phone, cattleCount accepted\n');

  // 4. Section B: Add Insemination Details (Zero-dependency WhatsApp Deep Link)
  console.log('--- 4. Section B: Add Insemination Details & WhatsApp Deep Link ---');
  const aiPayload = {
    farmerId: createdFarmerId,
    date: new Date().toISOString().slice(0, 10),
    time: '11:30',
    cowCount: 2,
    cowTags: 'ET-2001, ET-2002',
    strawCode: 'Gir Bull Batch #GB-884',
    notes: 'Peak estrus observed, cervix relaxed and clear mucus.',
  };

  const createAiRes = await api('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(aiPayload),
  });
  console.log('Create Insemination response:', createAiRes.status, createAiRes.data.message);
  assert.strictEqual(createAiRes.status, 201);
  assert.strictEqual(createAiRes.data.success, true);
  assert(createAiRes.data.data.receiptNumber.startsWith('AI-'), 'Receipt number must start with AI-');
  assert.strictEqual(createAiRes.data.data.farmerId, createdFarmerId);
  assert.strictEqual(createAiRes.data.data.cowCount, 2);
  assert(createAiRes.data.whatsappLink !== undefined, 'WhatsApp deep link must be returned');
  console.log(`✅ Insemination saved permanently! Receipt: ${createAiRes.data.data.receiptNumber}`);
  console.log(`✅ WhatsApp deep link generated: ${createAiRes.data.whatsappLink}\n`);

  // Verify record is retrievable via GET
  const listAiRes = await api(`/inseminations?farmerId=${createdFarmerId}`, {
    headers: authHeaders,
  });
  assert.strictEqual(listAiRes.status, 200);
  assert(listAiRes.data.data.length >= 1, 'Insemination record must appear in list');
  console.log(`✅ Insemination record verified in GET /api/inseminations (found ${listAiRes.data.data.length} records)\n`);

  // --- Phase 3: Offline Idempotency & farmerClientId Verification ---
  console.log('--- Phase 3: Offline Idempotency & farmerClientId Verification ---');
  const offlineFarmerClientId = `offline-farmer-${Date.now()}`;
  const offlineFarmerMobile = `+91 96${Date.now().toString().slice(-8)}`;

  // 1. Create offline farmer with clientId
  const offFarmer1 = await api('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      clientId: offlineFarmerClientId,
      name: 'Rameshbhai Offline',
      mobile: offlineFarmerMobile,
      cowsOwned: 3,
    }),
  });
  assert.strictEqual(offFarmer1.status, 201);
  assert.strictEqual(offFarmer1.data.data.clientId, offlineFarmerClientId);

  // 2. Retry exact same farmer create (network retry simulation)
  const offFarmerRetry = await api('/farmers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      clientId: offlineFarmerClientId,
      name: 'Rameshbhai Offline',
      mobile: offlineFarmerMobile,
      cowsOwned: 3,
    }),
  });
  assert.strictEqual(offFarmerRetry.status, 200, 'Duplicate clientId must return 200 OK');
  assert.strictEqual(offFarmerRetry.data.data.id, offFarmer1.data.data.id, 'IDs must match exactly');
  console.log('✅ Farmer clientId idempotency verified: retry returns 200 with identical record');

  // 3. Create insemination referencing farmer by farmerClientId
  const offlineInsemClientId = `offline-insem-${Date.now()}`;
  const offInsem1 = await api('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      clientId: offlineInsemClientId,
      farmerClientId: offlineFarmerClientId,
      date: '2026-09-28',
      time: '14:00',
      cowCount: 1,
      strawCode: 'Murrah Buffalo #MB-101',
    }),
  });
  assert.strictEqual(offInsem1.status, 201);
  assert.strictEqual(offInsem1.data.data.farmerId, offFarmer1.data.data.id, 'Resolved farmerId must match');
  assert.strictEqual(offInsem1.data.data.clientId, offlineInsemClientId);
  console.log(`✅ Insemination with farmerClientId resolved correctly to farmer ${offFarmer1.data.data.id}`);

  // 4. Retry exact same insemination create (network retry simulation)
  const offInsemRetry = await api('/inseminations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      clientId: offlineInsemClientId,
      farmerClientId: offlineFarmerClientId,
      date: '2026-09-28',
      time: '14:00',
      cowCount: 1,
      strawCode: 'Murrah Buffalo #MB-101',
    }),
  });
  assert.strictEqual(offInsemRetry.status, 200, 'Duplicate insemination clientId must return 200 OK');
  assert.strictEqual(offInsemRetry.data.data.id, offInsem1.data.data.id, 'IDs must match');
  assert.strictEqual(offInsemRetry.data.data.receiptNumber, offInsem1.data.data.receiptNumber, 'Receipt numbers must match');
  console.log('✅ Insemination clientId idempotency verified: retry returns 200 with identical receipt\n');

  // Clean up offline test farmer and insemination in finally or cleanup step
  if (offFarmer1.data?.data?.id) {
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.farmer.delete({ where: { id: offFarmer1.data.data.id } }).catch(() => {});
    await p.$disconnect();
  }

  // 5. Section C: Update Settings (Clinic Info + Doctor Profile)
  console.log('--- 5. Section C: Update Settings (Clinic Info + Doctor Profile) ---');
  const updatedClinicName = 'VetAssist Bovine Reproductive Care Centre';
  const updatedDoctorName = 'Dr. Rajesh Verma (M.V.Sc)';
  const updatedPhone = '+91 98765 99999';

  const updateSettingsRes = await api('/settings', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      clinicName: updatedClinicName,
      address: 'Near Dairy Cooperative, Anand, Gujarat 388001',
      phone: updatedPhone,
      email: 'doctor@vetassist.com',
      doctorName: updatedDoctorName,
      theme: 'light',
      user: {
        name: updatedDoctorName,
        phone: updatedPhone,
        specialization: 'Senior Bovine Theriogenologist',
      },
    }),
  });
  console.log('Update Settings response:', updateSettingsRes.status, updateSettingsRes.data.message);
  assert.strictEqual(updateSettingsRes.status, 200);
  assert.strictEqual(updateSettingsRes.data.success, true);
  assert.strictEqual(updateSettingsRes.data.data.clinicName, updatedClinicName);
  assert.strictEqual(updateSettingsRes.data.user.name, updatedDoctorName);
  console.log('✅ Settings saved without 403 Forbidden! Clinic and Doctor updated.');

  // Verify GET /api/settings returns the updated data
  const getSettingsRes = await api('/settings', { headers: authHeaders });
  assert.strictEqual(getSettingsRes.status, 200);
  assert.strictEqual(getSettingsRes.data.data.clinicName, updatedClinicName);
  assert.strictEqual(getSettingsRes.data.data.doctorName, updatedDoctorName);
  console.log('✅ GET /api/settings confirmed persistent database update\n');

  // 6. Section D: Update Login Email & Password with Current Password Confirmation
  console.log('--- 6. Section D: Update Login Email & Password (Single Account In Place) ---');

  // Test 6a: Reject change with wrong current password
  const badCredRes = await api('/auth/credentials', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: 'WrongPassword@999',
      newEmail: 'newdoc@clinic.com',
      newPassword: 'ClientSecret@123',
    }),
  });
  assert.strictEqual(badCredRes.status, 400);
  console.log('✅ Security check: Wrong current password correctly rejected (400)');

  // Test 6b: Successfully update email and password
  const goodCredRes = await api('/auth/credentials', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      currentPassword: 'Doctor@123',
      newEmail: 'client.doctor@ananddairy.com',
      newPassword: 'ClientSecure@2026',
    }),
  });
  assert.strictEqual(goodCredRes.status, 200);
  assert.strictEqual(goodCredRes.data.user.email, 'client.doctor@ananddairy.com');
  const newClientToken = goodCredRes.data.token;
  console.log('✅ Credentials successfully updated in-place: email is now client.doctor@ananddairy.com');

  // Test 6c: Verify OLD credentials no longer work
  const oldLoginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'doctor@vetassist.com', password: 'Doctor@123' }),
  });
  assert.strictEqual(oldLoginRes.status, 401);
  console.log('✅ Old demo credentials rejected (401 Unauthorized)');

  // Test 6d: Verify NEW credentials work
  const newLoginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'client.doctor@ananddairy.com', password: 'ClientSecure@2026' }),
  });
  assert.strictEqual(newLoginRes.status, 200);
  assert(newLoginRes.data.token, 'New login returns fresh JWT');
  console.log('✅ New credentials authenticated successfully (200 OK)');

  // 7. Reset back to demo credentials so the developer can continue testing as requested in prompt Section D:
  console.log('\n--- 7. Resetting back to developer demo credentials for paired development ---');
  const resetCredRes = await api('/auth/credentials', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${newLoginRes.data.token}` },
    body: JSON.stringify({
      currentPassword: 'ClientSecure@2026',
      newEmail: 'doctor@vetassist.com',
      newPassword: 'Doctor@123',
    }),
  });
  assert.strictEqual(resetCredRes.status, 200);
  console.log('✅ Reset in-place to doctor@vetassist.com / Doctor@123 for developer testing');

  // Clean up only test records created during this run
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  if (createdFarmerId) {
    await prisma.farmer.delete({ where: { id: createdFarmerId } }).catch(() => {});
  }
  if (aliasFarmerRes.data?.data?.id) {
    await prisma.farmer.delete({ where: { id: aliasFarmerRes.data.data.id } }).catch(() => {});
  }
  await prisma.$disconnect();
  console.log('✅ Test-created farmer records cleaned up.');

  console.log('\n======================================================');
  console.log('🎉 ALL TESTS PASSED! Sections A, B, C, D 100% VERIFIED');
  console.log('======================================================\n');
}

runEndToEndVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
