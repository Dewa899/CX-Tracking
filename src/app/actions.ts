'use server';

import { db } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function updateEquipmentDate(equipmentId: string, fieldName: string, dateValue: string | null) {
  try {
    const docRef = db.collection('equipments').doc(equipmentId);
    
    let valueToSave: any = dateValue;
    if (dateValue) {
      const date = new Date(dateValue);
      valueToSave = date;
    }

    // 1. Update Firestore
    await docRef.update({
      [fieldName]: valueToSave
    });

    // 2. Update local mock file if in development
    if (process.env.NODE_ENV === 'development') {
      const mockFilePath = path.join(process.cwd(), 'src/lib/mockEquipments.json');
      if (fs.existsSync(mockFilePath)) {
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        const mockData = JSON.parse(rawData);
        
        // Reverse mapping to find the short name used in JSON
        const reverseMapping: any = {
          'L1 - RED TAG ROJ Date': 'roj_date',
          'L1 - RED TAG MSRA Submit': 'msra_submit',
          'L1 - RED TAG PTW Submit': 'ptw_submit',
          'L1 - RED TAG Plan Start': 'l1_plan_start',
          'L1 - RED TAG Plan End': 'l1_plan_end',
          'L1 - RED TAG SAI Date': 'sai_date',
          'L1 - RED TAG Submit Anchore Spec': 'submit_anchore_spec',
          'L1 - RED TAG Positioning Anchoring Start Date': 'positioning_anchoring_start_date',
          'L1 - RED TAG Anchored Verified QC': 'anchored_verified_qc',
          'L1 - RED TAG Red Tag Passed Date': 'red_tag_passed_date'
        };
        const shortName = reverseMapping[fieldName];

        const updatedData = mockData.map((item: any) => {
          if (item.id === equipmentId) {
            const newItem = { ...item, [fieldName]: valueToSave };
            if (shortName) newItem[shortName] = valueToSave;
            return newItem;
          }
          return item;
        });
        fs.writeFileSync(mockFilePath, JSON.stringify(updatedData, null, 2));
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment date:', error);
    return { success: false, error: String(error) };
  }
}

export async function resetEquipmentDate(equipmentId: string, fieldName: string) {
  try {
    const docRef = db.collection('equipments').doc(equipmentId);
    
    await docRef.update({
      [fieldName]: null
    });

    if (process.env.NODE_ENV === 'development') {
      const mockFilePath = path.join(process.cwd(), 'src/lib/mockEquipments.json');
      if (fs.existsSync(mockFilePath)) {
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        const mockData = JSON.parse(rawData);

        const reverseMapping: any = {
          'L1 - RED TAG ROJ Date': 'roj_date',
          'L1 - RED TAG MSRA Submit': 'msra_submit',
          'L1 - RED TAG PTW Submit': 'ptw_submit',
          'L1 - RED TAG Plan Start': 'l1_plan_start',
          'L1 - RED TAG Plan End': 'l1_plan_end',
          'L1 - RED TAG SAI Date': 'sai_date',
          'L1 - RED TAG Submit Anchore Spec': 'submit_anchore_spec',
          'L1 - RED TAG Positioning Anchoring Start Date': 'positioning_anchoring_start_date',
          'L1 - RED TAG Anchored Verified QC': 'anchored_verified_qc',
          'L1 - RED TAG Red Tag Passed Date': 'red_tag_passed_date'
        };
        const shortName = reverseMapping[fieldName];

        const updatedData = mockData.map((item: any) => {
          if (item.id === equipmentId) {
            const newItem = { ...item };
            newItem[fieldName] = null;
            if (shortName) newItem[shortName] = null;
            return newItem;
          }
          return item;
        });
        fs.writeFileSync(mockFilePath, JSON.stringify(updatedData, null, 2));
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error resetting equipment date:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateAreaPlanDates(area: string, level: string, startDate: string, endDate: string) {
  try {
    const fieldStart = `${level} - ${level === 'L1' ? 'RED TAG' : level === 'L2' ? 'YELLOW TAG' : 'GREEN TAG'} Plan Start`;
    const fieldEnd = `${level} - ${level === 'L1' ? 'RED TAG' : level === 'L2' ? 'YELLOW TAG' : 'GREEN TAG'} Plan End`;
    
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);

    const snapshot = await db.collection('equipments').where('AREA', '==', area).get();
    
    if (snapshot.empty) return { success: true, count: 0 };

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        [fieldStart]: startObj,
        [fieldEnd]: endObj
      });
    });

    await batch.commit();

    // Update local mock if in development
    if (process.env.NODE_ENV === 'development') {
      const mockFilePath = path.join(process.cwd(), 'src/lib/mockEquipments.json');
      if (fs.existsSync(mockFilePath)) {
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        const mockData = JSON.parse(rawData);
        
        // Map level to internal keys
        const startKey = level === 'L1' ? 'l1_plan_start' : level === 'L2' ? 'l2_plan_start' : 'l3_plan_start';
        const endKey = level === 'L1' ? 'l1_plan_end' : level === 'L2' ? 'l2_plan_end' : 'l3_plan_end';

        const updatedData = mockData.map((item: any) => {
          if (item.AREA === area) {
            return { 
              ...item, 
              [fieldStart]: startObj, 
              [fieldEnd]: endObj,
              [startKey]: startObj,
              [endKey]: endObj
            };
          }
          return item;
        });
        fs.writeFileSync(mockFilePath, JSON.stringify(updatedData, null, 2));
      }
    }

    revalidatePath('/');
    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('Error bulk updating plan dates:', error);
    return { success: false, error: String(error) };
  }
}