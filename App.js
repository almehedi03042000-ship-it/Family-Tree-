// ==========================================
// 1. STATE & INITIAL CONFIGURATION
// ==========================================
let familyData = [];
let currentRootId = null;
let svg, g, zoomHandler;
let currentZoomScale = 1;

// Demo Initial Data Matching UI
const demoData = [
    { id: "1", name: "আলেকজান্ডার ক্রুজ", gender: "male", fatherId: null, motherId: null, dob: "1945-01-01", isDeceased: false, occupation: "অবসরপ্রাপ্ত", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=Alexander" },
    { id: "2", name: "জেরি উইলো", gender: "female", fatherId: null, motherId: null, dob: "1946-05-12", isDeceased: false, occupation: "গৃহিণী", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=Jerry" },
    { id: "3", name: "ক্যালেন ক্রুজ", gender: "male", fatherId: "1", motherId: "2", spouseId: "4", dob: "1972-11-20", isDeceased: false, occupation: "ডাক্তার", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=Cullen" },
    { id: "4", name: "স্যামি চ্যাং", gender: "female", fatherId: null, motherId: null, spouseId: "3", dob: "1977-03-15", isDeceased: false, occupation: "শিক্ষক", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=Sammie" },
    { id: "5", name: "উইলিয়াম ক্রুজ", gender: "male", fatherId: "3", motherId: "4", dob: "2002-08-10", isDeceased: false, occupation: "ছাত্র", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=William" },
    { id: "6", name: "টেলর ক্রুজ", gender: "female", fatherId: "3", motherId: "4", dob: "2008-02-14", isDeceased: false, occupation: "ছাত্রী", photo: "https://api.dicebear.com/7.x/bottts/svg?seed=Taylor" }
];

// Load Theme and Initial Setup
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadFamilyData();
    initD3Canvas();
    renderTree();
    updateStatistics();
    setupEventListeners();
    populateFormOptions();
});

// ==========================================
// 2. THEME & LOCALSTORAGE MANAGEMENT
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}

document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    renderTree(); // Re-render for SVG colors
});

// ==========================================
// 3. D3 TREE CANVAS & ZOOM/PAN ENGINE
// ==========================================
function initD3Canvas() {
    const container = d3.select("#treeContainer");
    svg = d3.select("#treeSvg");
    g = d3.select("#treeGroup");

    zoomHandler = d3.zoom()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            currentZoomScale = event.transform.k;
        });

    svg.call(zoomHandler);
}

// Transform Flat JSON Array into Hierarchy
function buildHierarchy() {
    const dataMap = {};
    familyData.forEach(item => dataMap[item.id] = { ...item, children: [] });

    let rootNodes = [];

    familyData.forEach(item => {
        if (item.fatherId && dataMap[item.fatherId]) {
            dataMap[item.fatherId].children.push(dataMap[item.id]);
        } else if (!item.fatherId && !item.motherId) {
            rootNodes.push(dataMap[item.id]);
        }
    });

    // If specific subtree selected, find root
    if (currentRootId && dataMap[currentRootId]) {
        return d3.hierarchy(dataMap[currentRootId]);
    }

    return d3.hierarchy(rootNodes[0] || { name: "Root", children: [] });
}

// Render Tree to SVG
function renderTree() {
    g.selectAll("*").remove();

    if (familyData.length === 0) return;

    const root = buildHierarchy();
    const treeLayout = d3.tree().nodeSize([220, 180]);
    treeLayout(root);

    // Connector Lines (Parent -> Child)
    g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", document.documentElement.classList.contains("dark") ? "#4b5563" : "#cbd5e1")
        .attr("stroke-width", 2)
        .attr("d", d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y)
        );

    // Nodes (Cards)
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `node cursor-pointer id-${d.data.id}`)
        .attr("transform", d => `translate(${d.x - 80},${d.y - 45})`)
        .on("click", (event, d) => openProfileModal(d.data.id));

    // Card Container Box (Video Style Warm Theme)
    node.append("rect")
        .attr("width", 160)
        .attr("height", 90)
        .attr("rx", 14)
        .attr("fill", document.documentElement.classList.contains("dark") ? "#1f2937" : "#ffffff")
        .attr("stroke", d => d.data.gender === "male" ? "#3b82f6" : "#ec4899")
        .attr("stroke-width", 2)
        .attr("class", "shadow-lg transition-all duration-200");

    // Profile Avatar Circle
    node.append("foreignObject")
        .attr("x", 55)
        .attr("y", -20)
        .attr("width", 50)
        .attr("height", 50)
        .html(d => `<img src="${d.data.photo || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + d.data.id}" class="w-12 h-12 rounded-full border-2 border-amber-500 bg-white object-cover shadow">`);

    // Member Name
    node.append("text")
        .attr("x", 80)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("class", "fill-gray-800 dark:fill-gray-100 font-bold text-xs")
        .text(d => d.data.name);

    // Age / Year Badge (From Video UI)
    node.append("foreignObject")
        .attr("x", 20)
        .attr("y", 58)
        .attr("width", 120)
        .attr("height", 25)
        .html(d => {
            const year = d.data.dob ? new Date(d.data.dob).getFullYear() : 'N/A';
            const age = d.data.dob ? (new Date().getFullYear() - new Date(d.data.dob).getFullYear()) + ' বছর' : '';
            return `<div class="flex justify-center items-center space-x-1 text-[10px]">
                <span class="bg-amber-500 text-white px-1.5 py-0.2 rounded">${year}</span>
                <span class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.2 rounded">${age}</span>
            </div>`;
        });

    // Auto-center view on initial load
    resetZoom();
}

// Controls: Zoom In/Out/Reset
document.getElementById("zoomInBtn").addEventListener("click", () => svg.transition().call(zoomHandler.scaleBy, 1.2));
document.getElementById("zoomOutBtn").addEventListener("click", () => svg.transition().call(zoomHandler.scaleBy, 0.8));
function resetZoom() {
    svg.transition().duration(500).call(zoomHandler.transform, d3.zoomIdentity.translate(window.innerWidth / 2 - 80, 100).scale(1));
}
document.getElementById("resetZoomBtn").addEventListener("click", resetZoom);

// ==========================================
// 4. DATA & AUTO-RELATIONSHIP ENGINE
// ==========================================
function loadFamilyData() {
    const saved = localStorage.getItem("familyTreeData");
    familyData = saved ? JSON.parse(saved) : demoData;
    validateDataStructure();
}

function saveFamilyData() {
    localStorage.setItem("familyTreeData", JSON.stringify(familyData));
    populateFormOptions();
    updateStatistics();
    validateDataStructure();
    renderTree();
}

// Auto Generation Calculation (Feature 69-70)
function calculateGenerations() {
    if (familyData.length === 0) return 0;
    const depthMap = {};
    
    function getDepth(id) {
        if (depthMap[id]) return depthMap[id];
        const member = familyData.find(m => m.id === id);
        if (!member || !member.fatherId) return 1;
        depthMap[id] = 1 + getDepth(member.fatherId);
        return depthMap[id];
    }

    let maxDepth = 1;
    familyData.forEach(m => {
        maxDepth = Math.max(maxDepth, getDepth(m.id));
    });
    return maxDepth;
}

// Statistics Auto Calculation (Feature 45-49)
function updateStatistics() {
    document.getElementById("statTotal").innerText = familyData.length;
    document.getElementById("statMale").innerText = familyData.filter(m => m.gender === "male").length;
    document.getElementById("statFemale").innerText = familyData.filter(m => m.gender === "female").length;
    document.getElementById("statGens").innerText = calculateGenerations();
}

// Member Add/Edit Handler (Feature 53-54, 94-95)
document.getElementById("memberForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("editMemberId").value;
    
    const newMember = {
        id: editId || Date.now().toString(), // Auto Duplicate-free ID
        name: document.getElementById("formName").value,
        gender: document.getElementById("formGender").value,
        isDeceased: document.getElementById("formIsDeceased").value === "true",
        fatherId: document.getElementById("formFather").value || null,
        motherId: document.getElementById("formMother").value || null,
        occupation: document.getElementById("formOccupation").value,
        photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${document.getElementById("formName").value}`
    };

    if (editId) {
        const index = familyData.findIndex(m => m.id === editId);
        if (index !== -1) familyData[index] = newMember;
    } else {
        familyData.push(newMember);
    }

    saveFamilyData();
    document.getElementById("memberForm").reset();
    document.getElementById("editMemberId").value = "";
    document.getElementById("adminDrawer").classList.add("hidden");
});

// Dynamic Select Box Options for Parents
function populateFormOptions() {
    const fatherSelect = document.getElementById("formFather");
    const motherSelect = document.getElementById("formMother");

    fatherSelect.innerHTML = `<option value="">পিতা নির্বাচন করুন</option>`;
    motherSelect.innerHTML = `<option value="">মাতা নির্বাচন করুন</option>`;

    familyData.forEach(m => {
        if (m.gender === "male") fatherSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
        if (m.gender === "female") motherSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
}

// ==========================================
// 5. SEARCH & HIGHLIGHT SYSTEM
// ==========================================
const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById("searchSuggestions");

searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    searchSuggestions.innerHTML = "";

    if (!query) {
        searchSuggestions.classList.add("hidden");
        return;
    }

    const matches = familyData.filter(m => m.name.toLowerCase().includes(query));
    if (matches.length > 0) {
        searchSuggestions.classList.remove("hidden");
        matches.forEach(m => {
            const div = document.createElement("div");
            div.className = "p-2 hover:bg-emerald-50 dark:hover:bg-gray-700 cursor-pointer text-xs border-b border-gray-100 dark:border-gray-700 flex justify-between";
            div.innerHTML = `<span>${m.name}</span><span class="text-gray-400">${m.gender === 'male' ? 'পুরুষ' : 'মহিলা'}</span>`;
            div.onclick = () => highlightMember(m.id);
            searchSuggestions.appendChild(div);
        });
    } else {
        searchSuggestions.classList.add("hidden");
    }
});

function highlightMember(id) {
    searchSuggestions.classList.add("hidden");
    searchInput.value = "";
    
    // Highlight Node with Animation
    d3.selectAll(".node rect").attr("stroke-width", 2);
    const targetNode = d3.select(`.id-${id} rect`);
    
    if (!targetNode.empty()) {
        targetNode.transition().duration(300)
            .attr("stroke", "#f59e0b")
            .attr("stroke-width", 5);

        // Pan to Node Position
        const d3Data = d3.select(`.id-${id}`).datum();
        if (d3Data) {
            svg.transition().duration(750).call(
                zoomHandler.transform,
                d3.zoomIdentity.translate(window.innerWidth / 2 - d3Data.x, 150 - d3Data.y).scale(1.2)
            );
        }
    }
}

// ==========================================
// 6. PROFILE MODAL & LIGHTBOX VIEWER
// ==========================================
function openProfileModal(id) {
    const m = familyData.find(item => item.id === id);
    if (!m) return;

    document.getElementById("modalName").innerText = m.name;
    document.getElementById("modalPhoto").src = m.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.id}`;
    document.getElementById("modalBadge").innerText = m.gender === "male" ? "পুরুষ" : "মহিলা";
    document.getElementById("modalBadge").className = `text-xs px-2.5 py-0.5 rounded-full font-medium ${m.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`;
    document.getElementById("modalOccupation").innerText = m.occupation || "-";
    document.getElementById("modalDob").innerText = m.dob || "-";
    document.getElementById("modalDod").innerText = m.isDeceased ? "মৃত" : "জীবিত";

    const father = familyData.find(f => f.id === m.fatherId);
    document.getElementById("modalFather").innerText = father ? father.name : "-";

    const mother = familyData.find(f => f.id === m.motherId);
    document.getElementById("modalMother").innerText = mother ? mother.name : "-";

    document.getElementById("viewSubtreeBtn").onclick = () => {
        currentRootId = m.id;
        document.getElementById("resetSubtreeBtn").classList.remove("hidden");
        document.getElementById("profileModal").classList.add("hidden");
        renderTree();
    };

    document.getElementById("profileModal").classList.remove("hidden");
}

document.getElementById("closeProfileBtn").addEventListener("click", () => {
    document.getElementById("profileModal").classList.add("hidden");
});

document.getElementById("resetSubtreeBtn").addEventListener("click", () => {
    currentRootId = null;
    document.getElementById("resetSubtreeBtn").classList.add("hidden");
    renderTree();
});

// ==========================================
// 7. DATA VALIDATION & ERROR DIAGNOSTICS
// ==========================================
function validateDataStructure() {
    const errorList = document.getElementById("validationErrors");
    errorList.innerHTML = "";
    let errors = [];

    // Missing Parent Check
    familyData.forEach(m => {
        if (m.fatherId && !familyData.some(p => p.id === m.fatherId)) {
            errors.push(`${m.name}-এর নির্ধারিত পিতা সিস্টেমে পাওয়া যায়নি!`);
        }
    });

    // Circular Relation Check
    familyData.forEach(m => {
        if (m.id === m.fatherId) errors.push(`${m.name} নিজের পিতা হতে পারে না!`);
    });

    if (errors.length === 0) {
        errorList.innerHTML = `<li class="text-emerald-600 dark:text-emerald-400">কোনো ভুল পাওয়া যায়নি। ডেটাবেস নিখুঁত আছে!</li>`;
    } else {
        errors.forEach(err => {
            errorList.innerHTML += `<li>${err}</li>`;
        });
    }
}

// ==========================================
// 8. JSON EXPORT & IMPORT ENGINE
// ==========================================
document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(familyData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `family_tree_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById("importJsonInput").addEventListener("change", (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                familyData = importedData;
                saveFamilyData();
                alert("ডাটা সফলভাবে ইমপোর্ট করা হয়েছে!");
            }
        } catch (err) {
            alert("ভুল ফাইল ফরম্যাট! সঠিক JSON ফাইল আপলোড করুন।");
        }
    };
    fileReader.readAsText(e.target.files[0]);
});

// Drawer & UI Listeners
function setupEventListeners() {
    document.getElementById("statsToggleBtn").onclick = () => document.getElementById("statsPanel").classList.toggle("hidden");
    document.getElementById("closeStatsBtn").onclick = () => document.getElementById("statsPanel").classList.add("hidden");
    document.getElementById("adminLoginBtn").onclick = () => document.getElementById("adminDrawer").classList.remove("hidden");
    document.getElementById("closeAdminBtn").onclick = () => document.getElementById("adminDrawer").classList.add("hidden");
}

