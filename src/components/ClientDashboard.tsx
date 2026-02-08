"use client";

import React, { useState, useMemo } from "react";
import EquipmentTable from "./EquipmentTable";

export default function ClientDashboard({ initialData }: { initialData: any[] }) {
	const [vendorFilter, setVendorFilter] = useState("All");
	const [areaFilter, setAreaFilter] = useState("All");
	const [levelFilter, setLevelFilter] = useState("All");

	// State for dynamic reference dates
	const [l1PlanStart, setL1PlanStart] = useState<Date>(new Date("2025-11-10"));
	const [l1PlanEnd, setL1PlanEnd] = useState<Date>(new Date("2025-12-01"));
	
	const [l2PlanStart, setL2PlanStart] = useState<Date>(new Date("2026-01-26"));
	const [l2PlanEnd, setL2PlanEnd] = useState<Date>(new Date("2026-02-16"));

	const [l3PlanStart, setL3PlanStart] = useState<Date>(new Date("2026-04-22"));
	const [l3PlanEnd, setL3PlanEnd] = useState<Date>(new Date("2026-04-30"));

	const vendors = useMemo(() => {
		return ["All", ...Array.from(new Set(initialData.map(item => item.subcont_vendor).filter(Boolean)))].sort();
	}, [initialData]);

	const areas = useMemo(() => {
		return ["All", ...Array.from(new Set(initialData.map(item => item.area).filter(Boolean)))].sort();
	}, [initialData]);

	const filteredData = useMemo(() => {
		return initialData.filter(item => {
			const matchVendor = vendorFilter === "All" || item.subcont_vendor === vendorFilter;
			const matchArea = areaFilter === "All" || item.area === areaFilter;
			return matchVendor && matchArea;
		});
	}, [initialData, vendorFilter, areaFilter]);

	const totalEquipments = filteredData.length;
	const areaCounts = filteredData.reduce((acc: Record<string, number>, item: any) => {
		const area = item.area || 'Unknown';
		acc[area] = (acc[area] || 0) + 1;
		return acc;
	}, {});

	return (
		<main className="min-h-screen p-4 md:p-8 bg-gray-50">
			<div className="max-w-[98%] mx-auto">
				<h1 className="text-3xl font-bold mb-6 text-black">CX Tracking Schedule</h1>

				<div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
						<h3 className="text-gray-500 text-sm font-medium">Total Equipment</h3>
						<p className="text-2xl font-bold text-gray-800">{totalEquipments}</p>
					</div>
					{Object.entries(areaCounts).map(([area, count]) => (
						<div key={area} className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
							<h3 className="text-gray-500 text-sm font-medium">Area: {area}</h3>
							<p className="text-2xl font-bold text-gray-800">{count}</p>
						</div>
					))}
				</div>

				<div className="bg-white rounded-lg shadow p-4">
					<EquipmentTable 
						data={filteredData}
						vendorFilter={vendorFilter}
						setVendorFilter={setVendorFilter}
						areaFilter={areaFilter}
						setAreaFilter={setAreaFilter}
						levelFilter={levelFilter}
						setLevelFilter={setLevelFilter}
						vendors={vendors}
						areas={areas}
						l1Dates={{ start: l1PlanStart, end: l1PlanEnd, setStart: setL1PlanStart, setEnd: setL1PlanEnd }}
						l2Dates={{ start: l2PlanStart, end: l2PlanEnd, setStart: setL2PlanStart, setEnd: setL2PlanEnd }}
						l3Dates={{ start: l3PlanStart, end: l3PlanEnd, setStart: setL3PlanStart, setEnd: setL3PlanEnd }}
					/>
				</div>
			</div>
		</main>
	);
}
