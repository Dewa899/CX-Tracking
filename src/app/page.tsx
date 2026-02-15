import { db } from '@/lib/firebaseAdmin';
import ClientDashboard from '@/components/ClientDashboard';
import fs from 'fs';
import path from 'path';

export const revalidate = 3600;

async function getEquipments() {
  const isDev = process.env.NODE_ENV === 'development';
  const mockFilePath = path.join(process.cwd(), 'src/lib/mockEquipments.json');

  // 1. In Dev mode, try to return existing mock data first
  if (isDev) {
    try {
      if (fs.existsSync(mockFilePath)) {
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        if (rawData.trim()) {
          console.log('📦 Using local mock data (src/lib/mockEquipments.json)');
          return JSON.parse(rawData);
        }
      }
    } catch (error) {
      console.error("Error reading mock data:", error);
    }
  }

  // 2. If not Dev OR mock file doesn't exist, fetch from Firebase
  try {
    console.log('🔥 Fetching real data from Firebase...');
    const snapshot = await db.collection('equipments').get();
    if (snapshot.empty) {
      return [];
    }
    const equipments = snapshot.docs.map(doc => {
      const data = doc.data();
      const serializedData: any = { 
        id: doc.id,
        no: data['NO'],
        equipment_id: data['EQUIPMENT ID'],
        type: data['TYPE'],
        area: data['AREA'],
        subcont_vendor: data['Subcont/ Vendor'],
        
        // L1
        l1_plan_start: data['L1 - RED TAG Plan Start'],
        l1_plan_end: data['L1 - RED TAG Plan End'],
        roj_date: data['L1 - RED TAG ROJ Date'],
        msra_submit: data['L1 - RED TAG MSRA Submit'],
        ptw_submit: data['L1 - RED TAG PTW Submit'],
        sai_date: data['L1 - RED TAG SAI Date'],
        submit_anchore_spec: data['L1 - RED TAG Submit Anchore Spec'],
        positioning_anchoring_start_date: data['L1 - RED TAG Positioning Anchoring Start Date'],
        anchored_verified_qc: data['L1 - RED TAG Anchored Verified QC'],
        red_tag_passed_date: data['L1 - RED TAG Red Tag Passed Date'],
        l1_status: data['L1 - RED TAG Status'],
        l1_remark_cx: data['L1 - RED TAG Remark Cx Issue'],
        l1_remarks_ptw: data['L1 - RED TAG Remarks PTW + MSRA Issue'],
        
        // L2
        l2_start_date: data['L2 - YELLOW TAG Start Date'],
        l2_end_date: data['L2 - YELLOW TAG End Date'],
        msra_loto_submit: data['L2 - YELLOW TAG MSRA + LOTO Plan Submit'],
        power_control_cable_inplace: data['L2 - YELLOW TAG Power and Control Cable (EPMS/BAS) Inplace'],
        elec_tests_completed: data['L2 - YELLOW TAG Electrical Tests Completed'],
        mech_tests_completed: data['L2 - YELLOW TAG Mech Tests Completed'],
        installer_pre_startup_completed: data['L2 - YELLOW TAG Installer Pre-Startup Completed'],
        vendor_ps_required: data['L2 - YELLOW TAG Vendor PS Required (Y/N)'],
        vendor_pre_startup_completed: data['L2 - YELLOW TAG Vendor Pre-Startup Completed'],
        l2_qa_qc_script_completed: data['L2 - YELLOW TAG L2 QA/QC Script Completed'],
        l2_docs_uploaded: data['L2 - YELLOW TAG L2 Docs Uploaded (ACMS)'],
        loto_plan_implemented: data['L2 - YELLOW TAG LOTO Plan Implemented'],
        ivc_completed: data['L2 - YELLOW TAG IVC Completed (CxA)'],
        cyt_required: data['L2 - YELLOW TAG CYT? (Y/N)'],
        cyt_end_date: data['L2 - YELLOW TAG CYT End Date'],
        cyt_finished: data['L2 - YELLOW TAG CYT Finish? (Y/N)'],
        yt_passed_date: data['L2 - YELLOW TAG YT Passed Date'],
        l2_status: data['L2 - YELLOW TAG Status'],
        l2_remark_cx: data['L2 - YELLOW TAG Remark Cx Issue'],
        l2_remarks_ptw: data['L2 - YELLOW TAG Remarks PTW Issue'],

        // L3
        l3_start_date: data['L3 - GREEN TAG Start Date'],
        l3_end_date: data['L3 - GREEN TAG End Date'],
        energization_msra_submitted: data['L3 - GREEN TAG Energization MSRA Submitted'],
        comm_scripts_submitted: data['L3 - GREEN TAG Commissioning Scripts Submitted'],
        load_bank_plan_submitted: data['L3 - GREEN TAG Load Bank Plan Submitted'],
        startup_plan_submitted: data['L3 - GREEN TAG Startup Plan Submitted'],
        pre_energization_meeting: data['L3 - GREEN TAG Pre-Energization Meeting'],
        energization_plan_submitted: data['L3 - GREEN TAG Energization Plan Submitted'],
        load_bank_required: data['L3 - GREEN TAG Load Bank Required? (Y/N)'],
        temp_load_bank_install: data['L3 - GREEN TAG Temporary Load bank installation'],
        l3_ptw_submit: data['L3 - GREEN TAG PTW Submit'],
        energized_date: data['L3 - GREEN TAG Energized Date'],
        l3_startup_scripts_completed: data['L3 - GREEN TAG L3 Startup Scripts Completed (ACMS)'],
        fok_witnessed: data['L3 - GREEN TAG FoK Witnessed (Y/N)'],
        load_burn_in_completed: data['L3 - GREEN TAG Load & Burn in Test Completed'],
        ir_scan_uploaded: data['L3 - GREEN TAG IR Scan / TMS Report Uploaded'],
        epms_verification_completed: data['L3 - GREEN TAG EPMS Verification Completed'],
        open_close_issues: data['L3 - GREEN TAG Open/ Close Cx Issues'],
        green_tag_passed_date: data['L3 - GREEN TAG Green Tag Passed Date (Completed)'],
        l3_status: data['L3 - GREEN TAG Status'],
        l3_remarks: data['L3 - GREEN TAG Remarks Cx / PTW Issue'],

        ...data 
      };
      
      for (const key in serializedData) {
        if (serializedData[key] && typeof serializedData[key] === 'object') {
           if ('_seconds' in serializedData[key]) {
             serializedData[key] = {
               _seconds: serializedData[key]._seconds,
               _nanoseconds: serializedData[key]._nanoseconds
             };
           } else if (serializedData[key].toDate) {
             const date = serializedData[key].toDate();
             serializedData[key] = {
                _seconds: Math.floor(date.getTime() / 1000),
                _nanoseconds: 0 
             };
           }
        }
      }
      return serializedData;
    }).sort((a, b) => {
      const noA = parseInt(String(a.no)) || 0;
      const noB = parseInt(String(b.no)) || 0;
      return noA - noB;
    });

    // 3. Save to mock file in Dev mode for future use
    if (isDev) {
      console.log('💾 Saving real data to mock file for future development...');
      fs.writeFileSync(mockFilePath, JSON.stringify(equipments, null, 2));
    }

    return equipments;
  } catch (error) {
    console.error("Error fetching equipments:", error);
    return [];
  }
}

export default async function Home() {
  const equipments = await getEquipments();

  return (
    <ClientDashboard initialData={equipments} />
  );
}
