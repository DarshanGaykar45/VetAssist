/**
 * Comprehensive Integration Test Suite for VetAssist Cattle AI Clinic
 */

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🚀 Starting Cattle Insemination Clinic Integration Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

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

  try {
    // 1. Health check
    console.log('1. Health Check Endpoint');
    const health = await api('/health');
    assert(health.status === 200, 'Health check returns status 200');
    assert(health.data.service.includes('Insemination'), `Service is ${health.data.service}`);

    // 2. Strict No Public Registration Test
    console.log('\n2. Security Check: No Public Registration');
    const regAttempt = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'hacker@example.com', password: 'Password123' }),
    });
    assert(regAttempt.status === 404, 'POST /api/auth/register is disabled and returns 404 Not Found');

    // 3. Single Doctor Login
    console.log('\n3. Single Doctor Authentication');
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'doctor@vetassist.com', password: 'Doctor@123' }),
    });
    assert(loginRes.status === 200, 'Doctor login succeeds with HTTP 200');
    assert(!!loginRes.data.token, 'Returns valid JWT token');
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 4. Verify /auth/me
    console.log('\n4. Verify Authenticated Profile');
    const meRes = await api('/auth/me', { headers: authHeaders });
    assert(meRes.status === 200, '/api/auth/me returns 200');
    assert(meRes.data.user.email === 'doctor@vetassist.com', 'Authenticated doctor profile matches');

    // 5. Farmers Directory CRUD
    console.log('\n5. Farmer Directory & Cattle Management');
    const farmersList = await api('/farmers', { headers: authHeaders });
    assert(farmersList.status === 200, 'GET /api/farmers returns 200');
    assert(Array.isArray(farmersList.data.data), 'Farmers data is an array');

    const testMobile = `+9198${Date.now().toString().slice(-8)}`;
    const newFarmer = await api('/farmers', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Govind Rabari',
        mobile: testMobile,
        cowsOwned: 3,
        village: 'Vasna Village, Anand',
        cows: [
          { tagNumber: `TAG-${Date.now().toString().slice(-4)}`, name: 'Kamdhenu', breed: 'Gir', purpose: 'Dairy' },
        ],
      }),
    });
    assert(newFarmer.status === 201, 'POST /api/farmers creates new farmer with nested cow');
    const createdFarmerId = newFarmer.data.data?.id;

    // 6. Insemination Record + Receipt Generation
    console.log('\n6. Insemination Record Creation & Receipt Logic');
    const today = new Date().toISOString().slice(0, 10);
    const aiRes = await api('/inseminations', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        farmerId: createdFarmerId,
        date: today,
        time: '10:00',
        cowCount: 1,
        strawCode: 'Elite Gir Bull #G-9901',
        notes: 'Integration test automated visit',
      }),
    });
    assert(aiRes.status === 201, 'POST /api/inseminations creates record with status 201');
    assert(aiRes.data.whatsappLink !== undefined, 'Includes WhatsApp deep link (wa.me)');

    const aiRecordId = aiRes.data.data?.id;

    // 7. Resend WhatsApp Receipt
    console.log('\n7. Resend WhatsApp Receipt Endpoint');
    const resendRes = await api(`/inseminations/${aiRecordId}/resend-whatsapp`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(resendRes.status === 200, 'POST /api/inseminations/:id/resend-whatsapp returns 200');
    assert(resendRes.data.whatsappLink !== undefined, 'Returns updated WhatsApp deep link');

    // 8. Dashboard Statistics
    console.log('\n8. Dashboard AI Metrics');
    const dashRes = await api('/dashboard/stats', { headers: authHeaders });
    assert(dashRes.status === 200, 'GET /api/dashboard/stats returns 200');
    assert(typeof dashRes.data.data.totalFarmers === 'number', `Total farmers: ${dashRes.data.data.totalFarmers}`);
    assert(Array.isArray(dashRes.data.data.inseminationsTrend), 'Inseminations trend is an array');

    // 9. Insemination Reports
    console.log('\n9. Reports & Analytics');
    const repRes = await api('/reports/analytics', { headers: authHeaders });
    assert(repRes.status === 200, 'GET /api/reports/analytics returns 200');
    assert(repRes.data.data.dailySummary !== undefined, 'Includes daily insemination summary');
    assert(Array.isArray(repRes.data.data.topFarmers), 'Includes top farmers by AI volume');

    // 10. Settings Endpoint
    console.log('\n10. Settings & Receipt Header Info');
    const setRes = await api('/settings', { headers: authHeaders });
    assert(setRes.status === 200, 'GET /api/settings returns 200');
    assert(setRes.data.data.clinicName !== undefined, `Clinic name: ${setRes.data.data.clinicName}`);

    // 11. Verify Deleted Routes Return 404
    console.log('\n11. Unmounted Routes Check (Billing, Inventory, Prescriptions, Doctors)');
    const billing404 = await api('/billing', { headers: authHeaders });
    const inventory404 = await api('/inventory', { headers: authHeaders });
    const prescriptions404 = await api('/prescriptions', { headers: authHeaders });
    const doctors404 = await api('/doctors', { headers: authHeaders });

    assert(billing404.status === 404, '/api/billing returns 404 Not Found');
    assert(inventory404.status === 404, '/api/inventory returns 404 Not Found');
    assert(prescriptions404.status === 404, '/api/prescriptions returns 404 Not Found');
    assert(doctors404.status === 404, '/api/doctors returns 404 Not Found');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
