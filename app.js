let familyData = [];
let currentRootId = null;
let svg, g, zoomHandler;
let isAdminLoggedIn = false;

const DEFAULT_MALE_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=SardarMaleAvatar&backgroundColor=b6e3f4";
const DEFAULT_FEMALE_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=SardarFemaleAvatar&backgroundColor=ffdfbf";

const demoData = [
    { id: "1", name: "আব্দুল সরদার", nameEn: "Abdul Sardar", gender: "male", fatherId: null, motherId: null, dob: "1945-01-01", isDeceased: false, occupation: "কৃষক", photo: "" },
    { id: "2", name: "রহিমা খাতুন", nameEn: "Rahima Khatun", gender: "female", fatherId: null, motherId: null, dob: "1950-03-10", isDeceased: false, occupation: "গৃহিণী", photo: "" },
    { id: "3", name: "রফিকুল সরদার", nameEn: "Rofiqul Sardar", gender: "male", fatherId: "1", motherId: "2", dob: "1975-06-15", isDeceased: false, occupation: "ব্যবসায়ী", photo: "" }
];

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    loadFamilyData();
    initD3Canvas();
    renderTree();
    updateStatistics();
    setupEventListeners();
    populateFormOptions();
    initMobileHistorySupport();
});

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}

document.getElementById("themeToggleBtn").onclick = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    renderTree();
};

function initD3Canvas() {
    svg = d3.select("#treeSvg");
    g = d3.select("#treeGroup");

    zoomHandler = d3.zoom()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoomHandler);
}

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

    if (currentRootId && dataMap[currentRootId]) {
        return d3.hierarchy(dataMap[currentRootId]);
    }

    return d3.hierarchy(rootNodes[0] || { name: "Root", children: [] });
}

function renderTree() {
    g.selectAll("*").remove();
    if (familyData.length === 0) return;

    const root = buildHierarchy();
    const treeLayout = d3.tree().nodeSize([200, 160]);
    treeLayout(root);

    // Links
    g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", document.documentElement.classList.contains("dark") ? "#374151" : "#d1d5db")
        .attr("stroke-width", 2)
        .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    // Nodes
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `node cursor-pointer id-${d.data.id}`)
        .attr("transform", d => `translate(${d.x - 75},${d.y - 40})`)
        .on("click", (event, d) => openProfileModal(d.data.id));

    // Card Rect
    node.append("rect")
        .attr("width", 150)
        .attr("height", 85)
        .attr("rx", 16)
        .attr("fill", document.documentElement.classList.contains("dark") ? "#111827" : "#ffffff")
        .attr("stroke", d => d.data.gender === "male" ? "#3b82f6" : "#ec4899")
        .attr("stroke-width", 2);

    // Profile Photo
    node.append("foreignObject")
        .attr("x", 52)
        .attr("y", -18)
        .attr("width", 46)
        .attr("height", 46)
        .html(d => {
            const imgSrc = d.data.photo || (d.data.gender === "female" ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR);
            return `<img src="${imgSrc}" class="w-11 h-11 rounded-2xl border-2 border-amber-500 bg-amber-50 object-cover shadow-md">`;
        });

    // Name Bengali
    node.append("text")
        .attr("x", 75)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("class", "fill-gray-800 dark:fill-gray-100 font-bold text-xs")
        .text(d => d.data.name);

    // Name English
    node.append("text")
        .attr("x", 75)
        .attr("y", 53)
        .attr("text-anchor", "middle")
        .attr("class", "fill-gray-400 dark:fill-gray-400 text-[10px] italic")
        .text(d => d.data.nameEn || "");

    // Badge
    node.append("foreignObject")
        .attr("x", 15)
        .attr("y", 60)
        .attr("width", 120)
        .attr("height", 20)
        .html(d => {
            const year = d.data.dob ? new Date(d.data.dob).getFullYear() : 'N/A';
            return `<div class="flex justify-center items-center space-x-1 text-[9px]">
                <span class="bg-amber-500 text-white px-1.5 py-0.2 rounded-md font-semibold">${year}</span>
                <span class="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.2 rounded-md">${d.data.gender === 'male' ? 'পুরুষ' : 'নারী'}</span>
            </div>`;
        });

    resetZoom();
}

// Controls
document.getElementById("zoomInBtn").onclick = () => svg.transition().call(zoomHandler.scaleBy, 1.2);
document.getElementById("zoomOutBtn").onclick = () => svg.transition().call(zoomHandler.scaleBy, 0.8);
function resetZoom() {
    svg.transition().duration(500).call(zoomHandler.transform, d3.zoomIdentity.translate(window.innerWidth / 2 - 75, 120).scale(1));
}
document.getElementById("resetZoomBtn").onclick = resetZoom;

function loadFamilyData() {
    const saved = localStorage.getItem("sardarFamilyTreeData");
    familyData = saved ? JSON.parse(saved) : demoData;
}

function saveFamilyData() {
    localStorage.setItem("sardarFamilyTreeData", JSON.stringify(familyData));
    populateFormOptions();
    updateStatistics();
    renderTree();
}

function updateStatistics() {
    document.getElementById("topStatTotal").innerText = familyData.length;
    document.getElementById("topStatMale").innerText = familyData.filter(m => m.gender === "male").length;
    document.getElementById("topStatFemale").innerText = familyData.filter(m => m.gender === "female").length;
}

// Search Engine
const searchInput = document.getElementById("searchInput");
const searchSuggestions = document.getElementById("searchSuggestions");

searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    searchSuggestions.innerHTML = "";

    if (!query) {
        searchSuggestions.classList.add("hidden");
        return;
    }

    const matches = familyData.filter(m => 
        (m.name && m.name.toLowerCase().includes(query)) || 
        (m.nameEn && m.nameEn.toLowerCase().includes(query))
    );

    if (matches.length > 0) {
        searchSuggestions.classList.remove("hidden");
        matches.forEach(m => {
            const div = document.createElement("div");
            div.className = "p-2 hover:bg-amber-50 dark:hover:bg-gray-700/50 cursor-pointer text-xs flex justify-between items-center";
            div.innerHTML = `<span><b>${m.name}</b> <i class="text-gray-400">(${m.nameEn || ''})</i></span><span class="text-[10px] text-gray-400">${m.gender === 'male' ? 'পুরুষ' : 'নারী'}</span>`;
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
    
    d3.selectAll(".node rect").attr("stroke-width", 2);
    const targetNode = d3.select(`.id-${id} rect`);
    
    if (!targetNode.empty()) {
        targetNode.transition().duration(300).attr("stroke", "#f59e0b").attr("stroke-width", 4);
        const d3Data = d3.select(`.id-${id}`).datum();
        if (d3Data) {
            svg.transition().duration(750).call(
                zoomHandler.transform,
                d3.zoomIdentity.translate(window.innerWidth / 2 - d3Data.x, 150 - d3Data.y).scale(1.2)
            );
        }
    }
}

function initMobileHistorySupport() {
    window.addEventListener("popstate", () => closeAllModals());
}

function pushModalState() {
    history.pushState({ modalOpen: true }, "");
}

function closeAllModals() {
    document.getElementById("profileModal").classList.add("hidden");
    document.getElementById("adminDrawer").classList.add("hidden");
    document.getElementById("adminLoginModal").classList.add("hidden");
}

function openProfileModal(id) {
    const m = familyData.find(item => item.id === id);
    if (!m) return;

    pushModalState();

    document.getElementById("modalName").innerText = m.name;
    document.getElementById("modalNameEn").innerText = m.nameEn ? `(${m.nameEn})` : '';
    document.getElementById("modalPhoto").src = m.photo || (m.gender === "female" ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR);
    document.getElementById("modalBadge").innerText = m.gender === "male" ? "পুরুষ" : "নারী";
    document.getElementById("modalBadge").className = `text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.gender === 'male' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200'}`;
    document.getElementById("modalOccupation").innerText = m.occupation || "-";
    document.getElementById("modalDob").innerText = m.dob || "-";
    document.getElementById("modalDod").innerText = m.isDeceased ? "মৃত" : "-";
    document.getElementById("modalStatus").innerText = m.isDeceased ? "মৃত" : "জীবিত";

    const father = familyData.find(f => f.id === m.fatherId);
    document.getElementById("modalFather").innerText = father ? father.name : "-";

    const mother = familyData.find(f => f.id === m.motherId);
    document.getElementById("modalMother").innerText = mother ? mother.name : "-";

    const editBtn = document.getElementById("adminEditMemberBtn");
    if (isAdminLoggedIn) {
        editBtn.classList.remove("hidden");
        editBtn.onclick = () => {
            closeAllModals();
            openEditForm(m);
        };
    } else {
        editBtn.classList.add("hidden");
    }

    document.getElementById("viewSubtreeBtn").onclick = () => {
        currentRootId = m.id;
        document.getElementById("resetSubtreeBtn").classList.remove("hidden");
        closeAllModals();
        renderTree();
    };

    document.getElementById("profileModal").classList.remove("hidden");
}

document.getElementById("adminLoginBtn").onclick = () => {
    if (isAdminLoggedIn) {
        pushModalState();
        document.getElementById("adminDrawer").classList.remove("hidden");
    } else {
        pushModalState();
        document.getElementById("adminLoginModal").classList.remove("hidden");
    }
};

document.getElementById("adminLoginForm").onsubmit = (e) => {
    e.preventDefault();
    const pass = document.getElementById("adminPassword").value;
    if (pass === "12345") {
        isAdminLoggedIn = true;
        document.getElementById("adminLoginModal").classList.add("hidden");
        document.getElementById("adminDrawer").classList.remove("hidden");
        document.getElementById("adminPassword").value = "";
    } else {
        alert("ভুল পাসওয়ার্ড!");
    }
};

document.getElementById("adminLogoutBtn").onclick = () => {
    isAdminLoggedIn = false;
    closeAllModals();
};

function openEditForm(member) {
    document.getElementById("adminDrawer").classList.remove("hidden");
    document.getElementById("formTitle").innerText = "তথ্য এডিট করুন";
    document.getElementById("editMemberId").value = member.id;
    document.getElementById("formName").value = member.name || "";
    document.getElementById("formNameEn").value = member.nameEn || "";
    document.getElementById("formGender").value = member.gender || "male";
    document.getElementById("formIsDeceased").value = member.isDeceased ? "true" : "false";
    document.getElementById("formFather").value = member.fatherId || "";
    document.getElementById("formMother").value = member.motherId || "";
    document.getElementById("formDob").value = member.dob || "";
    document.getElementById("formOccupation").value = member.occupation || "";
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

document.getElementById("memberForm").onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById("editMemberId").value;
    
    const photoInput = document.getElementById("formPhotoUpload");
    let photoData = "";
    if (photoInput.files.length > 0) {
        photoData = await getBase64(photoInput.files[0]);
    } else if (editId) {
        const existing = familyData.find(m => m.id === editId);
        if (existing) photoData = existing.photo;
    }

    const memberData = {
        id: editId || Date.now().toString(),
        name: document.getElementById("formName").value,
        nameEn: document.getElementById("formNameEn").value,
        gender: document.getElementById("formGender").value,
        isDeceased: document.getElementById("formIsDeceased").value === "true",
        fatherId: document.getElementById("formFather").value || null,
        motherId: document.getElementById("formMother").value || null,
        dob: document.getElementById("formDob").value,
        occupation: document.getElementById("formOccupation").value,
        photo: photoData
    };

    if (editId) {
        const index = familyData.findIndex(m => m.id === editId);
        if (index !== -1) familyData[index] = memberData;
    } else {
        familyData.push(memberData);
    }

    saveFamilyData();
    document.getElementById("memberForm").reset();
    document.getElementById("editMemberId").value = "";
    closeAllModals();
};

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

function setupEventListeners() {
    document.getElementById("closeProfileBtn").onclick = closeAllModals;
    document.getElementById("closeAdminBtn").onclick = closeAllModals;
    document.getElementById("closeAdminLoginBtn").onclick = closeAllModals;
    document.getElementById("resetSubtreeBtn").onclick = () => {
        currentRootId = null;
        document.getElementById("resetSubtreeBtn").classList.add("hidden");
        renderTree();
    };
}
