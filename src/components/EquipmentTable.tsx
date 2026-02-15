"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
	updateEquipmentDate,
	resetEquipmentDate,
	updateAreaPlanDates,
} from "@/app/actions";

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
	searchTerm,
	setSearchTerm,
	vendors,
	areas,
	l1Dates,
	l2Dates,
	l3Dates,
}: {
	data: Equipment[];
	vendorFilter: string;
	setVendorFilter: (v: string) => void;
	areaFilter: string;
	setAreaFilter: (a: string) => void;
	levelFilter: string;
	setLevelFilter: (l: string) => void;
	searchTerm: string;
	setSearchTerm: (s: string) => void;
	vendors: string[];
	areas: string[];
	l1Dates: {
		start: Date;
		end: Date;
		setStart: (d: Date) => void;
		setEnd: (d: Date) => void;
	};
	l2Dates: {
		start: Date;
		end: Date;
		setStart: (d: Date) => void;
		setEnd: (d: Date) => void;
	};
	l3Dates: {
		start: Date;
		end: Date;
		setStart: (d: Date) => void;
		setEnd: (d: Date) => void;
	};
}) {
	const router = useRouter();
	const [showDebug, setShowDebug] = useState(false);

	// Pagination State
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 50;

	// Reset page when filters change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [vendorFilter, areaFilter, levelFilter, searchTerm]);

	const totalPages = Math.ceil(data.length / pageSize);
	const startIndex = (currentPage - 1) * pageSize;
	const paginatedData = data.slice(startIndex, startIndex + pageSize);

	// Edit Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingData, setEditingData] = useState<{
		id: string;
		equipmentId: string;
		fieldName: string;
		displayName: string;
		currentValue: any;
	} | null>(null);
	const [tempDate, setTempDate] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isBulkSaving, setIsBulkSave] = useState(false);

	const handleBulkSave = async (
		level: string,
		dates: { start: Date; end: Date },
	) => {
		const startStr = toInputDate(dates.start);
		const endStr = toInputDate(dates.end);

		const msg = `Are you sure you want to update ALL equipment in Area "${areaFilter}" for ${level} with:\nStart: ${startStr}\nEnd: ${endStr}?`;

		if (!confirm(msg)) return;

		setIsBulkSave(true);
		const res = await updateAreaPlanDates(areaFilter, level, startStr, endStr);
		setIsBulkSave(false);

		if (res.success) {
			alert(`Successfully updated ${res.count} items in ${areaFilter}`);
			router.refresh();
		} else {
			alert("Bulk update failed: " + res.error);
		}
	};

	const openEditModal = (
		item: Equipment,
		field: string,
		displayName: string,
	) => {
		const val = item[field];
		setEditingData({
			id: item.id,
			equipmentId: item.equipment_id || item.id,
			fieldName: getRawFieldName(field),
			displayName,
			currentValue: val,
		});

		const d = getDate(val);
		setTempDate(d ? d.toISOString().split("T")[0] : "");
		setIsModalOpen(true);
	};

	const getRawFieldName = (field: string) => {
		const mapping: any = {
			roj_date: "L1 - RED TAG ROJ Date",
			msra_submit: "L1 - RED TAG MSRA Submit",
			ptw_submit: "L1 - RED TAG PTW Submit",
			l1_plan_start: "L1 - RED TAG Plan Start",
			l1_plan_end: "L1 - RED TAG Plan End",
			sai_date: "L1 - RED TAG SAI Date",
			submit_anchore_spec: "L1 - RED TAG Submit Anchore Spec",
			positioning_anchoring_start_date:
				"L1 - RED TAG Positioning Anchoring Start Date",
			anchored_verified_qc: "L1 - RED TAG Anchored Verified QC",
			red_tag_passed_date: "L1 - RED TAG Red Tag Passed Date",
		};
		return mapping[field] || field;
	};

	const handleSave = async () => {
		if (!editingData) return;
		setIsSaving(true);
		const res = await updateEquipmentDate(
			editingData.id,
			editingData.fieldName,
			tempDate,
		);
		setIsSaving(false);
		if (res.success) {
			setIsModalOpen(false);
			router.refresh();
		} else {
			alert("Failed to save: " + res.error);
		}
	};

	const handleReset = async () => {
		if (!editingData) return;
		if (
			!confirm("Are you sure you want to reset this field to default formula?")
		)
			return;
		setIsSaving(true);
		const res = await resetEquipmentDate(editingData.id, editingData.fieldName);
		setIsSaving(false);
		if (res.success) {
			setIsModalOpen(false);
			router.refresh();
		} else {
			alert("Failed to reset: " + res.error);
		}
	};

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
		return d
			? d.toLocaleDateString("en-GB", {
					day: "2-digit",
					month: "2-digit",
					year: "2-digit",
				})
			: "-";
	};

	const addDays = (date: Date | null, days: number): Date | null => {
		if (!date) return null;
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	};

	const getWeekNum = (date: Date | null, refDate: Date): number | string => {
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
		const dRoj = diffDays(addDays(planStart, -28), now);
		const dMsra = diffDays(addDays(planStart, -14), now);
		const dSai = diffDays(addDays(planStart, 7), now);
		const dAS = diffDays(addDays(planStart, 14), now);
		const dPos = diffDays(addDays(planStart, 21), now);
		const dAV = diffDays(addDays(planStart, 28), now);
		const dRT = diffDays(addDays(planStart, 28), now);
		const kDone = isDone(item.submit_anchore_spec);
		const mDone = isDone(item.anchored_verified_qc);

		if (!item.roj_date)
			return dRoj !== null && dRoj >= 0
				? `ROJ Late (${dRoj}d)`
				: `ROJ OVERDUE (${Math.abs(dRoj || 0)}d)`;
		if (!item.msra_submit)
			return dMsra !== null && dMsra >= 0
				? `MSRA Sub (${dMsra}d)`
				: `MSRA OVERDUE (${Math.abs(dMsra || 0)}d)`;
		if (!item.sai_date)
			return dSai !== null && dSai >= 0
				? `SAI Date (${dSai}d)`
				: `SAI OVERDUE (${Math.abs(dSai || 0)}d)`;
		if (!kDone)
			return dAS !== null && dAS >= 0
				? `Anchor Spec (${dAS}d)`
				: `Anchor Spec OVERDUE (${Math.abs(dAS || 0)}d)`;
		if (!item.positioning_anchoring_start_date)
			return dPos !== null && dPos >= 0
				? `Pos Start (${dPos}d)`
				: `Pos Start OVERDUE (${Math.abs(dPos || 0)}d)`;
		if (!mDone)
			return dAV !== null && dAV >= 0
				? `Anc Verif (${dAV}d)`
				: `Anc Verif OVERDUE (${Math.abs(dAV || 0)}d)`;
		if (!item.red_tag_passed_date)
			return dRT !== null && dRT >= 0
				? `RT Overdue (${dRT}d)`
				: `RT Passed OVERDUE (${Math.abs(dRT || 0)}d)`;
		return "Red Tag Passed";
	};

	const getL2Status = (item: Equipment, planStart: Date, now: Date) => {
		const vendor = (item.vendor_ps_required || "").toUpperCase();
		const cyt = (item.cyt_required || "").toUpperCase();
		const cytFin = (item.cyt_finished || "").toUpperCase();
		const msraDueL2 = addDays(planStart, -14);
		const dMsraL2 = diffDays(msraDueL2, now);

		if (!item.msra_loto_submit)
			return dMsraL2 !== null && dMsraL2 < 0
				? `MSRA Overdue ${Math.abs(dMsraL2)}d`
				: `MSRA Submit? (${dMsraL2 || 0}d)`;
		if (!item.power_control_cable_inplace) return "Cable Inplace?";
		if (!item.elec_tests_completed) return "Elec Tests?";
		if (!item.mech_tests_completed) return "Mech Tests?";
		if (!item.installer_pre_startup_completed) return "Install PS?";
		if (vendor !== "Y" && vendor !== "N") return "Vnd PS Req?";
		if (vendor === "Y" && !item.vendor_pre_startup_completed)
			return "Vnd PS Comp?";
		if (!item.l2_qa_qc_script_completed) return "QA/QC Script?";
		if (!item.l2_docs_uploaded) return "Docs Upload?";
		if (!item.loto_plan_implemented) return "LOTO Imp?";
		if (!item.ivc_completed) return "IVC Comp?";
		if (cyt !== "Y" && cyt !== "N") return "Need CYT?";
		const cytEnd = item.cyt_end_date ? new Date(item.cyt_end_date) : null;
		if (cyt === "Y" && cytFin !== "Y") {
			if (cytEnd && now > cytEnd) return "Overdue CYT";
			return "Need Approval";
		}
		if (!item.yt_passed_date) return "YT Pass Date?";
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
		epmsVerif: Date | null,
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

		if (!item.energization_msra_submitted)
			return dAT !== null && dAT < 0
				? `MSRA Overdue ${Math.abs(dAT)}d`
				: `MSRA due ${dAT}d`;
		if (!item.comm_scripts_submitted)
			return dAU !== null && dAU < 0
				? `Scripts Overdue ${Math.abs(dAU)}d`
				: `Scripts due ${dAU}d`;
		if (!lbKnown && !item.load_bank_plan_submitted) return "LB Req? (Y/N)";
		if (needLB && !item.load_bank_plan_submitted)
			return dAV !== null && dAV < 0
				? `LB Plan Overdue ${Math.abs(dAV)}d`
				: `LB Plan due ${dAV}d`;
		if (!item.startup_plan_submitted)
			return dAW !== null && dAW < 0
				? `Startup Overdue ${Math.abs(dAW)}d`
				: `Startup due ${dAW}d`;
		if (!item.pre_energization_meeting)
			return dAX !== null && dAX < 0
				? `Mtg Overdue ${Math.abs(dAX)}d`
				: `Mtg due ${dAX}d`;
		if (!item.energization_plan_submitted)
			return dAY !== null && dAY < 0
				? `Plan Overdue ${Math.abs(dAY)}d`
				: `Plan due ${dAY}d`;
		if (!lbKnown && !item.temp_load_bank_install) return "LB Req? (Y/N)";
		if (needLB && !item.temp_load_bank_install) return "Temp LB Inst?";
		if (!ptwOK) return "PTW No Sub";
		if (!item.energized_date)
			return dBC !== null && dBC < 0
				? `En Date Overdue ${Math.abs(dBC)}d`
				: `En Date?`;
		if (!item.l3_startup_scripts_completed)
			return dBD !== null && dBD < 0
				? `L3 Scr Overdue ${Math.abs(dBD)}d`
				: `L3 Scripts?`;
		if (!item.fok_witnessed) return "FoK Wit? (Y/N)";
		if (!item.load_burn_in_completed)
			return dBF !== null && dBF < 0
				? `Burn-in Overdue ${Math.abs(dBF)}d`
				: `Burn-in?`;
		if (!item.ir_scan_uploaded)
			return dBG !== null && dBG < 0
				? `IR/TMS Overdue ${Math.abs(dBG)}d`
				: `IR Scan?`;
		if (!item.epms_verification_completed)
			return dBH !== null && dBH < 0
				? `EPMS Overdue ${Math.abs(dBH)}d`
				: `EPMS Verif?`;
		if (cxOpen) return `Cx Issue`;
		return "Completed";
	};

	const PencilIcon = ({ onClick }: { onClick: () => void }) => (
		<button
			onClick={onClick}
			className="ml-1 p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-blue-600 transition-colors shrink-0"
			title="Edit Date"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
			</svg>
		</button>
	);

	return (
		<div className="flex flex-col gap-4">
			{/* Modal Overlay */}
			{isModalOpen && editingData && (
				<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
						<div className="p-5 border-b bg-white flex justify-between items-center">
							<div className="flex flex-col text-black">
								<h3 className="font-bold text-xl">Update Schedule</h3>
								<p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
									{editingData.equipmentId}
								</p>
							</div>
							<button
								onClick={() => setIsModalOpen(false)}
								className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
						<div className="p-6 space-y-6">
							<div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
								<p className="text-xs font-bold text-blue-600 uppercase mb-1">
									Editing Column
								</p>
								<p className="font-semibold text-blue-900">
									{editingData.displayName}
								</p>
							</div>
							<div>
								<label className="block text-sm font-bold text-gray-700 mb-2">
									New Date Selection
								</label>
								<input
									type="date"
									value={tempDate}
									onChange={(e) => setTempDate(e.target.value)}
									className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-black transition-all font-medium"
								/>
							</div>
						</div>
						<div className="p-6 bg-gray-50/50 flex flex-col gap-3">
							<div className="flex gap-3">
								<button
									onClick={() => setIsModalOpen(false)}
									className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
								>
									Cancel
								</button>
								<button
									onClick={handleSave}
									disabled={isSaving}
									className="flex-[2] px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
								>
									{isSaving ? (
										<>
											<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Saving...
										</>
									) : (
										"Save Changes"
									)}
								</button>
							</div>
							<button
								onClick={handleReset}
								disabled={isSaving}
								className="w-full px-4 py-3 text-sm font-bold text-red-600 bg-transparent border border-transparent rounded-xl hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-2"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
									<path d="M3 3v5h5"></path>
								</svg>
								Reset to Default Formula
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border">
				<div className="flex gap-4 items-center flex-wrap flex-1 mr-4">
					<div className="flex flex-col">
						<label className="text-xs font-bold text-gray-700">
							Filter Vendor
						</label>
						<select
							value={vendorFilter}
							onChange={(e) => setVendorFilter(e.target.value)}
							className="text-sm p-1 border rounded bg-white text-black"
						>
							{vendors.map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
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
							{areas.map((a) => (
								<option key={a} value={a}>
									{a}
								</option>
							))}
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
					<div className="flex flex-col flex-1 min-w-[200px]">
						<label className="text-xs font-bold text-gray-700">
							Search Equipment / Area / Vendor
						</label>
						<input
							type="text"
							placeholder="Search..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="text-sm p-1 border rounded bg-white text-black w-full"
						/>
					</div>
					<div className="w-px h-8 bg-gray-300 mx-2 hidden lg:block"></div>
					{areaFilter !== "All" && levelFilter === "L1" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L1 Plan Start
								</label>
								<input
									type="date"
									value={toInputDate(l1Dates.start)}
									onChange={(e) => l1Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L1 Plan End
								</label>
								<input
									type="date"
									value={toInputDate(l1Dates.end)}
									onChange={(e) => l1Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<button
								onClick={() => handleBulkSave("L1", l1Dates)}
								disabled={isBulkSaving}
								className="mt-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
							>
								{isBulkSaving ? "Saving..." : "Save L1 Plan"}
							</button>
						</>
					)}
					{areaFilter !== "All" && levelFilter === "L2" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L2 Plan Start
								</label>
								<input
									type="date"
									value={toInputDate(l2Dates.start)}
									onChange={(e) => l2Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L2 Plan End
								</label>
								<input
									type="date"
									value={toInputDate(l2Dates.end)}
									onChange={(e) => l2Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<button
								onClick={() => handleBulkSave("L2", l2Dates)}
								disabled={isBulkSaving}
								className="mt-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
							>
								{isBulkSaving ? "Saving..." : "Save L2 Plan"}
							</button>
						</>
					)}
					{areaFilter !== "All" && levelFilter === "L3" && (
						<>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L3 Plan Start
								</label>
								<input
									type="date"
									value={toInputDate(l3Dates.start)}
									onChange={(e) => l3Dates.setStart(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<div className="flex flex-col">
								<label className="text-xs font-bold text-gray-700">
									L3 Plan End
								</label>
								<input
									type="date"
									value={toInputDate(l3Dates.end)}
									onChange={(e) => l3Dates.setEnd(new Date(e.target.value))}
									className="text-sm p-1 border rounded text-black"
								/>
							</div>
							<button
								onClick={() => handleBulkSave("L3", l3Dates)}
								disabled={isBulkSaving}
								className="mt-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
							>
								{isBulkSaving ? "Saving..." : "Save L3 Plan"}
							</button>
						</>
					)}
				</div>
				<button
					onClick={() => setShowDebug(!showDebug)}
					className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors text-black font-medium"
				>
					{showDebug ? "Hide Debug" : "Show Debug"}
				</button>
			</div>

			<div className="overflow-x-auto border-2 border-black rounded-lg shadow-xl max-h-[800px]">
				<table className="min-w-max w-full text-[11px] text-black border-separate border-spacing-0">
					<thead className="z-[100] sticky top-0 bg-white">
						{/* Level 0 Headers */}
						<tr className="h-[45px]">
							<th
								rowSpan={2}
								className="px-2 py-0 border-r-2 border-b-2 border-black text-left font-black bg-gray-200 sticky left-0 top-0 z-[110] w-12 text-black"
							>
								No
							</th>
							<th
								rowSpan={2}
								className="px-2 py-0 border-r-2 border-b-2 border-black text-left font-black bg-gray-200 sticky left-12 top-0 z-[110] min-w-[150px] whitespace-nowrap text-black"
							>
								Equipment ID
							</th>
							{vendorFilter === "All" &&
								areaFilter === "All" &&
								levelFilter === "All" && (
									<th
										rowSpan={2}
										className="px-2 py-0 border-r border-b-2 border-black text-left font-bold bg-gray-100 text-black sticky top-0 z-[100]"
									>
										Type
									</th>
								)}
							<th
								rowSpan={2}
								className="px-2 py-0 border-r border-b-2 border-black text-left font-bold bg-gray-100 text-black sticky top-0 z-[100]"
							>
								Area
							</th>
							<th
								rowSpan={2}
								className="px-2 py-0 border-r-2 border-b-2 border-black text-left font-bold bg-gray-100 text-black sticky top-0 z-[100]"
							>
								Subcont/ Vendor
							</th>

							{(levelFilter === "All" || levelFilter === "L1") && (
								<th
									colSpan={17}
									className="px-2 py-0 border-r-2 border-b-2 border-black text-center font-black bg-red-600 text-white sticky top-0 z-[90] uppercase tracking-wider"
								>
									L1 - RED TAG
								</th>
							)}
							{(levelFilter === "All" || levelFilter === "L2") && (
								<th
									colSpan={23}
									className="px-2 py-0 border-r-2 border-b-2 border-black text-center font-black bg-amber-500 text-white sticky top-0 z-[90] uppercase tracking-wider"
								>
									L2 - YELLOW TAG
								</th>
							)}
							{(levelFilter === "All" || levelFilter === "L3") && (
								<th
									colSpan={24}
									className="px-2 py-0 border-r-2 border-b-2 border-black text-center font-black bg-emerald-600 text-white sticky top-0 z-[90] uppercase tracking-wider"
								>
									L3 - GREEN TAG
								</th>
							)}
						</tr>

						{/* Level 1 Headers */}
						<tr className="h-[40px]">
							{(levelFilter === "All" || levelFilter === "L1") && (
								<>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										ROJ Date
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										MSRA Sub
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										PTW Sub
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-blue-100 font-bold min-w-[85px] text-blue-900 sticky top-[45px] z-[90] text-center">
										Plan Start
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-blue-100 font-bold min-w-[85px] text-blue-900 sticky top-[45px] z-[90] text-center">
										Plan End
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Days
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Week
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										SAI Date
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										Anc Spec
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										Anc Start
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										Anc Verif
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[85px] text-red-900 sticky top-[45px] z-[90] text-center">
										RT Pass
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Act Wk
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[100px] text-red-900 sticky top-[45px] z-[90] text-center">
										Status
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[150px] text-red-900 sticky top-[45px] z-[90] text-center">
										Remark Cx
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-red-50 font-bold min-w-[150px] text-red-900 sticky top-[45px] z-[90] text-center">
										Remark PTW
									</th>
									<th className="px-1 py-1 border-r-2 border-b-2 border-black bg-gray-100 font-bold min-w-[80px] text-black sticky top-[45px] z-[90] text-center">
										Duration
									</th>
								</>
							)}
							{(levelFilter === "All" || levelFilter === "L2") && (
								<>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Start
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										End
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Days
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Week
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										MSRA
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Cable
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Elec
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Mech
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Install
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold w-12 text-amber-900 sticky top-[45px] z-[90] text-center">
										Vnd?
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Vnd PS
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										QA/QC
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Docs
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										LOTO
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										IVC
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold w-12 text-amber-900 sticky top-[45px] z-[90] text-center">
										CYT?
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										CYT End
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold w-12 text-amber-900 sticky top-[45px] z-[90] text-center">
										Fin?
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[85px] text-amber-900 sticky top-[45px] z-[90] text-center">
										YT Pass
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Act
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[100px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Status
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-amber-50 font-bold min-w-[150px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Remark Cx
									</th>
									<th className="px-1 py-1 border-r-2 border-b-2 border-black bg-amber-50 font-bold min-w-[150px] text-amber-900 sticky top-[45px] z-[90] text-center">
										Remark PTW
									</th>
								</>
							)}
							{(levelFilter === "All" || levelFilter === "L3") && (
								<>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Start
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										End
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Days
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Week
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										MSRA
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Script
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										LB Plan
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Startup
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Pre-En
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										En Plan
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold w-12 text-emerald-900 sticky top-[45px] z-[90] text-center">
										LB?
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Temp LB
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										PTW Sub
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Energiz
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										L3 Scr
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold w-12 text-emerald-900 sticky top-[45px] z-[90] text-center">
										FoK?
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Burnin
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										IR Scan
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										EPMS
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Cx Iss
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[85px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										GT Pass
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-gray-100 font-bold w-12 text-black sticky top-[45px] z-[90] text-center">
										Act
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[100px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Status
									</th>
									<th className="px-1 py-1 border-r border-b-2 border-black bg-emerald-50 font-bold min-w-[150px] text-emerald-900 sticky top-[45px] z-[90] text-center">
										Remarks
									</th>
								</>
							)}
						</tr>
					</thead>
					<tbody className="bg-white">
						{paginatedData.map((item, idx) => {
							const l1PlanStart = getDate(item.l1_plan_start) || l1Dates.start;
							const l1PlanEnd = getDate(item.l1_plan_end) || l1Dates.end;
							const rojDate =
								getDate(item.roj_date) || addDays(l1PlanStart, -28);
							const msraSubmit =
								getDate(item.msra_submit) || addDays(l1PlanStart, -14);
							const ptwSubmit =
								getDate(item.ptw_submit) || addDays(l1PlanStart, -1);
							const saiDate = getDate(item.sai_date) || addDays(l1PlanStart, 7);
							const anchorSpecDate =
								getDate(item.submit_anchore_spec) || addDays(l1PlanStart, 7);
							const posAnchorStart =
								getDate(item.positioning_anchoring_start_date) ||
								addDays(l1PlanStart, 14);
							const anchorVerifiedQC =
								getDate(item.anchored_verified_qc) || addDays(l1PlanStart, 21);
							const redTagPassedCalc =
								getDate(item.red_tag_passed_date) || anchorVerifiedQC;
							const l1TotalDays = getDurationDays(l1PlanStart, l1PlanEnd);
							const l1PlanWeeks = getWeekNum(l1PlanStart, l1Dates.start);
							const l1ActualWeeks = getWeekNum(redTagPassedCalc, l1Dates.start);
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
								epmsVerif,
							);

							return (
								<React.Fragment key={item.id}>
									<tr className="hover:bg-gray-50 text-black">
										<td className="px-2 py-2 border-r border-b border-black bg-white sticky left-0 z-10 text-center font-bold">
											{item.no || idx + startIndex + 1}
										</td>
										<td className="px-2 py-2 border-r-2 border-b border-black font-bold bg-white sticky left-12 z-10 whitespace-nowrap text-[10px] sm:text-xs">
											{item.equipment_id || item.id}
										</td>
										{vendorFilter === "All" &&
											areaFilter === "All" &&
											levelFilter === "All" && (
												<td className="px-2 py-2 border-r border-b border-black font-medium">
													{item.type || "-"}
												</td>
											)}
										<td className="px-2 py-2 border-r border-b border-black font-medium">
											{item.area || "-"}
										</td>
										<td className="px-2 py-2 border-r-2 border-b border-black font-medium">
											{item.subcont_vendor || "-"}
										</td>

										{/* L1 */}
										{(levelFilter === "All" || levelFilter === "L1") && (
											<>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.roj_date ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(rojDate)}
														<PencilIcon
															onClick={() =>
																openEditModal(item, "roj_date", "ROJ Date")
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.msra_submit ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(msraSubmit)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"msra_submit",
																	"MSRA Submit",
																)
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.ptw_submit ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(ptwSubmit)}
														<PencilIcon
															onClick={() =>
																openEditModal(item, "ptw_submit", "PTW Submit")
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-bold text-blue-800 ${item.l1_plan_start ? "bg-yellow-200" : "bg-blue-100/30"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(l1PlanStart)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"l1_plan_start",
																	"L1 Plan Start",
																)
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-bold text-blue-800 ${item.l1_plan_end ? "bg-yellow-200" : "bg-blue-100/30"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(l1PlanEnd)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"l1_plan_end",
																	"L1 Plan End",
																)
															}
														/>
													</div>
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l1TotalDays}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l1PlanWeeks}
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.sai_date ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(saiDate)}
														<PencilIcon
															onClick={() =>
																openEditModal(item, "sai_date", "SAI Date")
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.submit_anchore_spec ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(anchorSpecDate)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"submit_anchore_spec",
																	"Submit Anchore Spec",
																)
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.positioning_anchoring_start_date ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(posAnchorStart)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"positioning_anchoring_start_date",
																	"Positioning Start",
																)
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.anchored_verified_qc ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(anchorVerifiedQC)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"anchored_verified_qc",
																	"Anchored Verified",
																)
															}
														/>
													</div>
												</td>
												<td
													className={`px-1 py-1 border-r border-b border-black font-medium text-red-900 ${item.red_tag_passed_date ? "bg-yellow-200" : "bg-red-50"}`}
												>
													<div className="flex items-center justify-between">
														{formatDate(redTagPassedCalc)}
														<PencilIcon
															onClick={() =>
																openEditModal(
																	item,
																	"red_tag_passed_date",
																	"Red Tag Passed",
																)
															}
														/>
													</div>
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l1ActualWeeks}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium text-[10px] bg-red-50 text-center">
													{l1Status}
												</td>
												<td
													className="px-1 py-1 border-r border-b border-black truncate max-w-[150px] font-medium bg-red-50"
													title={item.l1_remark_cx}
												>
													{item.l1_remark_cx || "-"}
												</td>
												<td
													className="px-1 py-1 border-r border-b border-black truncate max-w-[150px] font-medium bg-red-50"
													title={item.l1_remarks_ptw}
												>
													{item.l1_remarks_ptw || "-"}
												</td>
												<td className="px-1 py-1 border-r-2 border-b border-black text-center font-bold bg-gray-50">
													{instTermDuration}
												</td>
											</>
										)}

										{/* L2 */}
										{(levelFilter === "All" || levelFilter === "L2") && (
											<>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(item.l2_start_date)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(l2End)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l2TotalDays}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l2PlanWeeks}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-bold text-blue-800 bg-blue-100/30">
													{formatDate(msraDueL2)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(cableInPlace)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(elecTests)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(mechTests)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(installerPS)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-amber-50">
													{item.vendor_ps_required || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(item.vendor_pre_startup_completed)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(qaqcScript)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(docsUploaded)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(lotoImplemented)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(ivcCompleted)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-amber-50">
													{item.cyt_required || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(cytEnd)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-amber-50">
													{item.cyt_finished || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-amber-50">
													{formatDate(ytPassedCalc)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l2ActualWeeks}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium text-[10px] bg-amber-50 text-center">
													{l2Status}
												</td>
												<td className="px-1 py-1 border-r border-b border-black truncate max-w-[150px] font-medium bg-amber-50">
													{item.l2_remark_cx || "-"}
												</td>
												<td className="px-1 py-1 border-r-2 border-b border-black truncate max-w-[150px] font-medium bg-amber-50">
													{item.l2_remarks_ptw || "-"}
												</td>
											</>
										)}

										{/* L3 */}
										{(levelFilter === "All" || levelFilter === "L3") && (
											<>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(item.l3_start_date)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(l3End)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l3TotalDays}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l3PlanWeeks}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(energMSRA)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(commScripts)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(lbPlan)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(startupPlan)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(preEnergMtg)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(energPlan)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-emerald-50">
													{item.load_bank_required || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(tempLB)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(l3PtwSubmit)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(energizedDate)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(l3StartupScripts)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-emerald-50">
													{item.fok_witnessed || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(loadBurnIn)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(irScan)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(epmsVerif)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{item.open_close_issues || "-"}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium bg-emerald-50">
													{formatDate(greenTagPassedCalc)}
												</td>
												<td className="px-1 py-1 border-r border-b border-black text-center font-medium bg-gray-50">
													{l3ActualWeeks}
												</td>
												<td className="px-1 py-1 border-r border-b border-black font-medium text-[10px] bg-emerald-50 text-center">
													{l3Status}
												</td>
												<td className="px-1 py-1 border-r border-b border-black truncate max-w-[150px] font-medium bg-emerald-50">
													{item.l3_remarks || "-"}
												</td>
											</>
										)}
									</tr>
									{showDebug && (
										<tr>
											<td
												colSpan={100}
												className="p-2 bg-gray-50 border-r border-b border-black"
											>
												<pre className="text-[10px] overflow-auto max-h-40">
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

			{/* Pagination Controls */}
			<div className="flex justify-between items-center bg-white p-4 rounded-lg border-2 border-black shadow-md mt-4">
				<div className="text-sm text-gray-600 font-bold">
					Showing <span className="text-black">{startIndex + 1}</span> to{" "}
					<span className="text-black">
						{Math.min(startIndex + pageSize, data.length)}
					</span>{" "}
					of <span className="text-black">{data.length}</span> entries
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1}
						className="px-4 py-2 text-sm font-black bg-white border-2 border-black rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all"
					>
						Previous
					</button>
					<div className="flex items-center px-4 text-sm font-black text-black border-x-2 border-black mx-2">
						Page {currentPage} / {totalPages}
					</div>
					<button
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
						className="px-4 py-2 text-sm font-black bg-white border-2 border-black rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all"
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
}
