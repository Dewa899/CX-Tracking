"use client";

import React, { useState } from "react";

type Equipment = {
	id: string;
	[key: string]: any;
};

// J1 Reference Date from Excel: 2025-11-10
const PROJECT_START_DATE_DEFAULT = new Date("2025-11-10");
// W1 Reference Date from Excel: 2026-01-26 (For L2 Plan Weeks)
const L2_REF_DATE_DEFAULT = new Date("2026-01-26");
// AQ1 Reference Date for L3 (Estimated from data)
const L3_REF_DATE_DEFAULT = new Date("2026-04-22");

export default function EquipmentTable({ 
	data,
	vendorFilter,
	setVendorFilter,
	areaFilter,
	setAreaFilter,
	levelFilter,
	setLevelFilter,
	vendors,
	areas,
	l1Dates,
	l2Dates,
	l3Dates
}: { 
	data: Equipment[],
	vendorFilter: string,
	setVendorFilter: (v: string) => void,
	areaFilter: string,
	setAreaFilter: (a: string) => void,
	levelFilter: string,
	setLevelFilter: (l: string) => void,
	vendors: string[],
	areas: string[],
	l1Dates: { start: Date, end: Date, setStart: (d: Date) => void, setEnd: (d: Date) => void },
	l2Dates: { start: Date, end: Date, setStart: (d: Date) => void, setEnd: (d: Date) => void },
	l3Dates: { start: Date, end: Date, setStart: (d: Date) => void, setEnd: (d: Date) => void }
}) {
	const [showDebug, setShowDebug] = useState(false);

	// Helper to safely get date string or Date object
	const getDate = (dateVal: any): Date | null => {
		if (!dateVal) return null;
		if (typeof dateVal === "object" && dateVal._seconds) {
			return new Date(dateVal._seconds * 1000);
		}
		if (typeof dateVal === "string") {
			try {
				const d = new Date(dateVal);
				if (isNaN(d.getTime())) return null;
				return d;
			} catch (e) {
				return null;
			}
		}
		return dateVal instanceof Date ? dateVal : null;
	};

	const formatDate = (dateVal: any) => {
		const d = getDate(dateVal);
		return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";
	};

	const addDays = (date: Date | null, days: number): Date | null => {
		if (!date) return null;
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	};

	const getWeekNum = (
		date: Date | null,
		refDate: Date,
	): number | string => {
		if (!date) return "";
		const diffTime = date.getTime() - refDate.getTime();
		const diffDays = diffTime / (1000 * 60 * 60 * 24);
		return Math.max(1, Math.floor(diffDays / 7) + 1);
	};

	const getDurationDays = (
		start: Date | null,
		end: Date | null,
	): number | string => {
		if (!start || !end) return "-";
		const diffTime = end.getTime() - start.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const diffDays = (date1: Date | null, date2: Date | null): number | null => {
		if (!date1 || !date2) return null;
		const diffTime = date1.getTime() - date2.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const isDate = (val: any): boolean => {
		return val instanceof Date && !isNaN(val.getTime());
	};

	const isDone = (val: any): boolean => {
		if (!val) return false;
		if (isDate(val)) return true;
		const str = String(val).trim().toUpperCase();
		return str === "Y" || str === "YES";
	};

	const toInputDate = (date: Date) => {
		return date.toISOString().split("T")[0];
	};

	// --- Status Logic Functions ---

	const getL1Status = (item: Equipment, planStart: Date, now: Date) => {
		// Hitung Due Dates & Selisih
		const dRoj = diffDays(addDays(planStart, -28), now);
		const dMsra = diffDays(addDays(planStart, -14), now);
		const dSai = diffDays(addDays(planStart, 7), now);
		const dAS = diffDays(addDays(planStart, 14), now);
		const dPos = diffDays(addDays(planStart, 21), now);
		const dAV = diffDays(addDays(planStart, 28), now);
		const dRT = diffDays(addDays(planStart, 28), now);

		// Cek Data Input (kDone & mDone)
		const kDone = isDone(item.submit_anchore_spec);
		const mDone = isDone(item.anchored_verified_qc);

		// Hierarki IF Excel
		if (!item.roj_date)
			return (dRoj !== null && dRoj >= 0)
				? `ROJ Late Information (${dRoj}d)`
				: `ROJ OVERDUE (${Math.abs(dRoj || 0)}d)`;
		if (!item.msra_submit)
			return (dMsra !== null && dMsra >= 0)
				? `MSRA Submission (${dMsra}d)`
				: `MSRA OVERDUE (${Math.abs(dMsra || 0)}d)`;
		if (!item.sai_date)
			return (dSai !== null && dSai >= 0)
				? `SAI Date (${dSai}d)`
				: `SAI Date OVERDUE (${Math.abs(dSai || 0)}d)`;
		if (!kDone)
			return (dAS !== null && dAS >= 0)
				? `Submit Anchor Spec (${dAS}d)`
				: `Submit Anchor Spec OVERDUE (${Math.abs(dAS || 0)}d)`;
		if (!item.positioning_anchoring_start_date)
			return (dPos !== null && dPos >= 0)
				? `Positioning Start (${dPos}d)`
				: `Positioning Start OVERDUE (${Math.abs(dPos || 0)}d)`;
		if (!mDone)
			return (dAV !== null && dAV >= 0)
				? `Anchored QC Verified (${dAV}d)`
				: `Anchored In Place Verified OVERDUE (${Math.abs(dAV || 0)}d)`;
		if (!item.red_tag_passed_date)
			return (dRT !== null && dRT >= 0)
				? `Red Tag Overdue (${dRT}d)`
				: `Red Tag Passed OVERDUE (${Math.abs(dRT || 0)}d)`;

		return "Red Tag Passed";
	};

	const getL2Status = (item: Equipment, planStart: Date, now: Date) => {
		const vendor = (item.vendor_ps_required || "").toUpperCase();
		const cyt = (item.cyt_required || "").toUpperCase();
		const cytFin = (item.cyt_finished || "").toUpperCase();

		const msraDueL2 = addDays(planStart, -14);
		const dMsraL2 = diffDays(msraDueL2, now);

		// Hierarki IFS Excel
		if (!item.msra_loto_submit) {
			return (dMsraL2 !== null && dMsraL2 < 0)
				? `MSRA Overdue ${Math.abs(dMsraL2)}days`
				: `MSRA LOTO Plan Submit? (${dMsraL2 || 0}d)`;
		}
		if (!item.power_control_cable_inplace) return "Power, EPMS/BAS inplace?";
		if (!item.elec_tests_completed) return "Electrical Tests Completed?";
		if (!item.mech_tests_completed) return "Mech Tests Completed?";
		if (!item.installer_pre_startup_completed)
			return "Installer Pre-Startup Completed?";
		if (vendor !== "Y" && vendor !== "N") return "Vendor PS Required?";
		if (vendor === "Y" && !item.vendor_pre_startup_completed)
			return "Vendor Pre-Startup Completed?";
		if (!item.l2_qa_qc_script_completed) return "QA/QC Script Completed?";
		if (!item.l2_docs_uploaded) return "Uploaded Doc (ACMS)?";
		if (!item.loto_plan_implemented) return "LOTO Must Implemented?";
		if (!item.ivc_completed) return "IVC Completed?";
		if (cyt !== "Y" && cyt !== "N") return "Need CYT?";

		const cytEnd = item.cyt_end_date ? new Date(item.cyt_end_date) : null;
		if (cyt === "Y" && cytFin !== "Y") {
			if (cytEnd && now > cytEnd) return "Overdue CYT";
			return "Need Approval DCDPM";
		}
		if (!item.yt_passed_date) return "YT Passed Date?";

		return "YT Passed";
	};

    const getL3Status = (
        item: Equipment, 
        planStart: Date,
        now: Date,
        energMSRA: Date | null,
        commScripts: Date | null,
        lbPlan: Date | null,
        startupPlan: Date | null,
        preEnergMtg: Date | null,
        energPlan: Date | null,
        energizedDate: Date | null,
        l3StartupScripts: Date | null,
        loadBurnIn: Date | null,
        irScan: Date | null,
        epmsVerif: Date | null
    ) => {
        const dAT = diffDays(energMSRA, now);
        const dAU = diffDays(commScripts, now);
        const dAV = diffDays(lbPlan, now);
        const dAW = diffDays(startupPlan, now);
        const dAX = diffDays(preEnergMtg, now);
        const dAY = diffDays(energPlan, now);
        const dBC = diffDays(energizedDate, now);
        const dBD = diffDays(l3StartupScripts, now);
        const dBF = diffDays(loadBurnIn, now);
        const dBG = diffDays(irScan, now);
        const dBH = diffDays(epmsVerif, now);

        const lbReq = (item.load_bank_required || "").trim().toUpperCase();
        const lbKnown = lbReq === "Y" || lbReq === "N";
        const needLB = lbReq === "Y";
        const cxStatus = (item.open_close_issues || "").trim().toUpperCase();
        const cxOpen = cxStatus.includes("OPEN");
        const ptwOK = !!item.l3_ptw_submit;

        if (!item.energization_msra_submitted) {
            return (dAT !== null && dAT < 0)
                ? `MSRA Overdue ${Math.abs(dAT)}d`
                : `MSRA due in ${dAT}d`;
        }
        if (!item.comm_scripts_submitted) {
            return (dAU !== null && dAU < 0)
                ? `Commissioning Scripts Overdue ${Math.abs(dAU)}d`
                : `Commissioning Scripts due in ${dAU}d`;
        }
        if (!lbKnown && !item.load_bank_plan_submitted) {
            return "Load Bank Required? (Y/N)";
        }
        if (needLB && !item.load_bank_plan_submitted) {
            return (dAV !== null && dAV < 0)
                ? `Load Bank Plan Overdue ${Math.abs(dAV)}d`
                : `Load Bank Plan due in ${dAV}d`;
        }
        if (!item.startup_plan_submitted) {
            return (dAW !== null && dAW < 0)
                ? `Startup Plan Overdue ${Math.abs(dAW)}d`
                : `Startup Plan due in ${dAW}d`;
        }
        if (!item.pre_energization_meeting) {
            return (dAX !== null && dAX < 0)
                ? `Pre-Energization Meeting Overdue ${Math.abs(dAX)}d`
                : `Pre-Energization Meeting due in ${dAX}d`;
        }
        if (!item.energization_plan_submitted) {
            return (dAY !== null && dAY < 0)
                ? `Energization Plan Overdue ${Math.abs(dAY)}d`
                : `Energization Plan due in ${dAY}d`;
        }
        if (!lbKnown && !item.temp_load_bank_install) {
            return "Load Bank Required? (Y/N)";
        }
        if (needLB && !item.temp_load_bank_install) {
            return "Temporary Load Bank Installation?";
        }
        if (!ptwOK) {
            return "PTW Not Submitted";
        }
        if (!item.energized_date) {
            return (dBC !== null && dBC < 0)
                ? `Energized Date Overdue ${Math.abs(dBC)}d`
                : `Energized Date?`;
        }
        if (!item.l3_startup_scripts_completed) {
            return (dBD !== null && dBD < 0)
                ? `L3 Scripts Overdue ${Math.abs(dBD)}d`
                : `L3 Startup Scripts Completed?`;
        }
        if (!item.fok_witnessed) {
            return "FoK Witnessed? (Y/N)";
        }
        if (!item.load_burn_in_completed) {
            return (dBF !== null && dBF < 0)
                ? `Load & Burn-in Overdue ${Math.abs(dBF)}d`
                : `Load & Burn-in Test Completed?`;
        }
        if (!item.ir_scan_uploaded) {
            return (dBG !== null && dBG < 0)
                ? `IR/TMS Upload Overdue ${Math.abs(dBG)}d`
                : `IR Scan / TMS Uploaded?`;
        }
        if (!item.epms_verification_completed) {
            return (dBH !== null && dBH < 0)
                ? `EPMS Verification Overdue ${Math.abs(dBH)}d`
                : `EPMS Verification Completed?`;
        }
        if (cxOpen) {
            return `Cx Issue`;
        }
        return "Completed";
    };

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border">
				<div className="flex gap-4 items-center flex-wrap">
					{/* Dropdown Filters */}
					<div className="flex flex-col">
						<label className="text-xs font-bold text-gray-700">
							Filter Vendor
						</label>
						<select 
							value={vendorFilter}
							onChange={(e) => setVendorFilter(e.target.value)}
							className="text-sm p-1 border rounded bg-white text-black"
						>
							{vendors.map(v => <option key={v} value={v}>{v}</option>)}
						</select>
					</div>

					<div className="flex flex-col">
						<label className="text-xs font-bold text-gray-700">
							Filter Area
						</label>
						<select 
							value={areaFilter}
							onChange={(e) => setAreaFilter(e.target.value)}
							className="text-sm p-1 border rounded bg-white text-black"
						>
							{areas.map(a => <option key={a} value={a}>{a}</option>)}
						</select>
					</div>

					<div className="flex flex-col">
						<label className="text-xs font-bold text-gray-700">
							Filter Process Level
						</label>
						<select 
							value={levelFilter}
							onChange={(e) => setLevelFilter(e.target.value)}
							className="text-sm p-1 border rounded bg-white text-black"
						>
							<option value="All">All Levels</option>
							<option value="L1">L1 - RED TAG</option>
							<option value="L2">L2 - YELLOW TAG</option>
							<option value="L3">L3 - GREEN TAG</option>
						</select>
					</div>

					<div className="w-px h-8 bg-gray-300 mx-2 hidden md:block"></div>

					{levelFilter === "L1" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L1 Plan Start Date</label>
								<input
									type="date"
									value={toInputDate(l1Dates.start)}
									onChange={(e) => l1Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L1 Plan End Date</label>
								<input
									type="date"
									value={toInputDate(l1Dates.end)}
									onChange={(e) => l1Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
						</>
					)}

					{levelFilter === "L2" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L2 Plan Start Date</label>
								<input
									type="date"
									value={toInputDate(l2Dates.start)}
									onChange={(e) => l2Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L2 Plan End Date</label>
								<input
									type="date"
									value={toInputDate(l2Dates.end)}
									onChange={(e) => l2Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
						</>
					)}

					{levelFilter === "L3" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L3 Plan Start Date</label>
								<input
									type="date"
									value={toInputDate(l3Dates.start)}
									onChange={(e) => l3Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">L3 Plan End Date</label>
								<input
									type="date"
									value={toInputDate(l3Dates.end)}
									onChange={(e) => l3Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
						</>
					)}
				</div>
				<button
					onClick={() => setShowDebug(!showDebug)}
					className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors text-black font-medium"
				>
					{showDebug ? "Hide Debug Data" : "Show Debug Data"}
				</button>
			</div>

			<div className="overflow-x-auto border rounded-lg shadow max-h-[800px]">
				<table className="min-w-max divide-y divide-gray-200 text-xs text-black border-collapse">
					<thead className="bg-gray-50 z-10 shadow-sm">
						{/* Level 0 Headers */}
						<tr>
							<th
								rowSpan={2}
								className="px-2 py-2 border text-left font-bold bg-gray-100 sticky left-0 top-0 z-40 w-10 text-black whitespace-normal leading-tight"
							>
								No
							</th>
							<th
								rowSpan={2}
								className="px-2 py-2 border text-left font-bold bg-gray-100 sticky left-10 top-0 z-40 w-24 text-black whitespace-normal leading-tight"
							>
								Equipment ID
							</th>
							{vendorFilter === "All" && areaFilter === "All" && levelFilter === "All" && (
								<th
									rowSpan={2}
									className="px-2 py-2 border text-left font-bold min-w-[100px] bg-gray-50 text-black sticky top-0 z-20 whitespace-normal leading-tight"
								>
									Type
								</th>
							)}
							<th
								rowSpan={2}
								className="px-2 py-2 border text-left font-bold min-w-[100px] bg-gray-50 text-black sticky top-0 z-20 whitespace-normal leading-tight"
							>
								Area
							</th>
							<th
								rowSpan={2}
								className="px-2 py-2 border text-left font-bold min-w-[100px] bg-gray-50 text-black sticky top-0 z-20 whitespace-normal leading-tight"
							>
								Subcont/ Vendor
							</th>

							{(levelFilter === "All" || levelFilter === "L1") && (
								<th
									colSpan={17}
									className="px-2 py-2 border text-center font-bold bg-red-200 text-black sticky top-0 z-20"
								>
									L1 - RED TAG
								</th>
							)}
							{(levelFilter === "All" || levelFilter === "L2") && (
								<th
									colSpan={23}
									className="px-2 py-2 border text-center font-bold bg-yellow-200 text-black sticky top-0 z-20"
								>
									L2 - YELLOW TAG
								</th>
							)}
							{(levelFilter === "All" || levelFilter === "L3") && (
								<th
									colSpan={24}
									className="px-2 py-2 border text-center font-bold bg-green-200 text-black sticky top-0 z-20"
								>
									L3 - GREEN TAG
								</th>
							)}
						</tr>

						{/* Level 1 Headers */}
						<tr>
							{/* L1 Columns */}
							{(levelFilter === "All" || levelFilter === "L1") && (
								<>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										ROJ Date
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										MSRA Submit
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										PTW Submit
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Plan Start
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Plan End
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Total Days
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Plan Weeks
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										SAI Date
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Submit Anchore Spec
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Positioning Anchoring Start
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Anchored Verified QC
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Red Tag Passed
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Actual Weeks
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Status
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[150px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Remark Cx
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[150px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Remarks PTW+MSRA
									</th>
									<th className="px-2 py-1 border bg-red-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Inst & Term Duration
									</th>
								</>
							)}

							{/* L2 Columns */}
							{(levelFilter === "All" || levelFilter === "L2") && (
								<>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Start Date
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										End Date
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Total Days
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Plan Weeks
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										MSRA+LOTO Submit
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Power/Control Cable Inplace
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Elec Tests
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Mech Tests
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Installer Pre-Startup
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Vendor PS Req?
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Vendor Pre-Startup
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										L2 QA/QC Script
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										L2 Docs Uploaded
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										LOTO Implemented
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										IVC Completed
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										CYT?
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										CYT End Date
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										CYT Finish?
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										YT Passed
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Actual Weeks
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Status
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[150px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Remark Cx
									</th>
									<th className="px-2 py-1 border bg-yellow-100 font-bold min-w-[150px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Remarks PTW
									</th>
								</>
							)}

							{/* L3 Columns */}
							{(levelFilter === "All" || levelFilter === "L3") && (
								<>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Start Date
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										End Date
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Total Days
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Plan Weeks
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Energization MSRA
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Comm Scripts
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Load Bank Plan
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Startup Plan
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Pre-Energ Mtg
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Energization Plan
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										LB Req?
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Temp LB Install
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										PTW Submit
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Energized Date
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										L3 Startup Scripts
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										FoK Witnessed?
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Load & Burn in
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										IR Scan/TMS Rpt
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										EPMS Verif
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Open/Close Issues
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Green Tag Passed
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold w-16 text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Actual Weeks
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[65px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Status
									</th>
									<th className="px-2 py-1 border bg-green-100 font-bold min-w-[150px] text-black sticky top-[37px] z-20 whitespace-normal leading-tight text-[10px]">
										Remarks Cx/PTW
									</th>
								</>
							)}
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{data.map((item, idx) => {
							// --- L1 Calculations ---
							const l1PlanStart = l1Dates.start;
							const l1PlanEnd = l1Dates.end;
							const rojDate = getDate(item.roj_date);
							const msraSubmit = addDays(l1PlanStart, -14);
							const ptwSubmit = addDays(l1PlanStart, -1);
							const saiDate = addDays(l1PlanStart, 7);
							const anchorSpecDate = addDays(l1PlanStart, 7);
							const posAnchorStart = addDays(l1PlanStart, 14);
							const anchorVerifiedQC = addDays(l1PlanStart, 21);
							const redTagPassedCalc = anchorVerifiedQC;

							const l1TotalDays = getDurationDays(l1PlanStart, l1PlanEnd);
							const l1PlanWeeks = getWeekNum(l1PlanStart, l1Dates.start);
							const l1ActualWeeks = getWeekNum(
								redTagPassedCalc,
								l1Dates.start,
							);

							// --- L2 Calculations ---
							const l2Start = l2Dates.start;
							const l2End = l2Dates.end;
							const msraDueL2 = addDays(l2Start, -14);
							const cableInPlace = addDays(l2Start, -1);
							const elecTests = l2Start;
							const mechTests = l2Start;
							const installerPS = addDays(mechTests, 7);
							const qaqcScript = addDays(installerPS, 1);
							const docsUploaded = addDays(qaqcScript, 2);
							const lotoImplemented = addDays(qaqcScript, 2);
							const ivcCompleted = addDays(lotoImplemented, 1);

							const cytRequired = item.cyt_required || "Y";
							const cytEnd =
								ivcCompleted && cytRequired.toUpperCase() === "Y"
									? addDays(ivcCompleted, 7)
									: null;

							const ytPassedCalc = cytEnd || ivcCompleted;

							const l2TotalDays = getDurationDays(l2Start, l2End);
							const l2PlanWeeks = getWeekNum(l2Start, l2Dates.start);
							const l2ActualWeeks = getWeekNum(ytPassedCalc, l1Dates.start);

							const instTermDuration =
								l2Start && redTagPassedCalc
									? getDurationDays(redTagPassedCalc, l2Start) + " days"
									: "";

							// --- L3 Calculations ---
							const l3Start = l3Dates.start;
							const l3End = l3Dates.end;
							const l3TotalDays = getDurationDays(l3Start, l3End);
							const l3PlanWeeks = getWeekNum(l3Start, l1Dates.start);

							const energMSRA = addDays(l3Start, -30);
							const commScripts = addDays(l3Start, -30);
							const lbPlan = addDays(l3Start, -45);
							const startupPlan = addDays(l3Start, -30);
							const preEnergMtg = addDays(l3Start, -7);
							const energPlan = addDays(l3Start, -5);
							const tempLB = addDays(l3Start, -7);
							const energizedDate = l3Start;
							const l3PtwSubmit = energizedDate
								? addDays(energizedDate, -1)
								: null;
							const l3StartupScripts = addDays(l3Start, 1);
							const loadBurnIn = addDays(energizedDate, 1);
							const irScan = addDays(energizedDate, 3);
							const epmsVerif = addDays(energizedDate, 3);

							const greenTagPassedCalc = epmsVerif;
							const l3ActualWeeks = getWeekNum(
								greenTagPassedCalc,
								l1Dates.start,
							);

							// --- Status Function Calls ---
							const l1Status = getL1Status(item, l1PlanStart, l1Dates.start);
							const l2Status = getL2Status(item, l2Start, l2Dates.start);
                            const l3Status = getL3Status(
                                item, 
                                l3Start, 
                                l3Dates.start, 
                                energMSRA, 
                                commScripts, 
                                lbPlan, 
                                startupPlan, 
                                preEnergMtg, 
                                energPlan, 
                                energizedDate, 
                                l3StartupScripts, 
                                loadBurnIn, 
                                irScan, 
                                epmsVerif
                            );

							return (
								<React.Fragment key={item.id}>
									<tr className="hover:bg-gray-50 text-black">
										<td className="px-2 py-2 border bg-white sticky left-0 z-10 text-center font-bold">
											{item.no || idx + 1}
										</td>
										<td className="px-2 py-2 border font-bold bg-white sticky left-10 z-10">
											{item.equipment_id || item.id}
										</td>
										{vendorFilter === "All" && areaFilter === "All" && levelFilter === "All" && (
											<td className="px-2 py-2 border font-medium">
												{item.type || "-"}
											</td>
										)}
										<td className="px-2 py-2 border font-medium">
											{item.area || "-"}
										</td>
										<td className="px-2 py-2 border font-medium">
											{item.subcont_vendor || "-"}
										</td>

										{/* L1 */}
										{(levelFilter === "All" || levelFilter === "L1") && (
											<>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(item.roj_date)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(msraSubmit)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(ptwSubmit)}
												</td>
												<td className="px-2 py-1 border font-bold text-blue-800 bg-blue-50/50">
													{formatDate(l1PlanStart)}
												</td>
												<td className="px-2 py-1 border font-bold text-blue-800 bg-blue-50/50">
													{formatDate(l1PlanEnd)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l1TotalDays}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l1PlanWeeks}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(saiDate)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(anchorSpecDate)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(posAnchorStart)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(anchorVerifiedQC)}
												</td>
												<td className="px-2 py-1 border font-medium bg-red-50 text-red-900">
													{formatDate(redTagPassedCalc)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l1ActualWeeks}
												</td>
												<td className="px-2 py-1 border font-medium">{l1Status}</td>
												<td
													className="px-2 py-1 border truncate max-w-[150px] font-medium"
													title={item.l1_remark_cx}
												>
													{item.l1_remark_cx || "-"}
												</td>
												<td
													className="px-2 py-1 border truncate max-w-[150px] font-medium"
													title={item.l1_remarks_ptw}
												>
													{item.l1_remarks_ptw || "-"}
												</td>
												<td className="px-2 py-1 border text-center font-bold">
													{instTermDuration}
												</td>
											</>
										)}

										{/* L2 */}
										{(levelFilter === "All" || levelFilter === "L2") && (
											<>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(item.l2_start_date)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(l2End)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l2TotalDays}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l2PlanWeeks}
												</td>
												<td className="px-2 py-1 border font-bold text-blue-800 bg-blue-50/50">
													{formatDate(msraDueL2)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(cableInPlace)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(elecTests)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(mechTests)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(installerPS)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{item.vendor_ps_required || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(item.vendor_pre_startup_completed)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(qaqcScript)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(docsUploaded)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(lotoImplemented)}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(ivcCompleted)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{item.cyt_required || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(cytEnd)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{item.cyt_finished || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-yellow-50 text-yellow-900">
													{formatDate(ytPassedCalc)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l2ActualWeeks}
												</td>
												<td className="px-2 py-1 border font-medium">{l2Status}</td>
												<td className="px-2 py-1 border truncate max-w-[150px] font-medium">
													{item.l2_remark_cx || "-"}
												</td>
												<td className="px-2 py-1 border truncate max-w-[150px] font-medium">
													{item.l2_remarks_ptw || "-"}
												</td>
											</>
										)}

										{/* L3 */}
										{(levelFilter === "All" || levelFilter === "L3") && (
											<>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(item.l3_start_date)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(l3End)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l3TotalDays}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l3PlanWeeks}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(energMSRA)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(commScripts)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(lbPlan)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(startupPlan)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(preEnergMtg)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(energPlan)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{item.load_bank_required || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(tempLB)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(l3PtwSubmit)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(energizedDate)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(l3StartupScripts)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{item.fok_witnessed || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(loadBurnIn)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(irScan)}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(epmsVerif)}
												</td>
												<td className="px-2 py-1 border font-medium">
													{item.open_close_issues || "-"}
												</td>
												<td className="px-2 py-1 border font-medium bg-green-50 text-green-900">
													{formatDate(greenTagPassedCalc)}
												</td>
												<td className="px-2 py-1 border text-center font-medium">
													{l3ActualWeeks}
												</td>
												<td className="px-2 py-1 border font-medium">{l3Status}</td>
												<td className="px-2 py-1 border truncate max-w-[150px] font-medium">
													{item.l3_remarks || "-"}
												</td>
											</>
										)}
									</tr>
									{showDebug && (
										<tr>
											<td colSpan={60} className="p-2 bg-gray-50 border">
												<pre className="text-xs overflow-auto max-h-40">
													{JSON.stringify(item, null, 2)}
												</pre>
											</td>
										</tr>
									)}
								</React.Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
