const reportStartDate = document.getElementById("reportStartDate");
const reportEndDate = document.getElementById("reportEndDate");
const reportModeFilter = document.getElementById("reportModeFilter");
const reportSectionFilter = document.getElementById("reportSectionFilter");
const reportsTableBody = document.getElementById("reportsTableBody");
const exportWordButton = document.getElementById("exportWordButton");
const printPreviewButton = document.getElementById("printPreviewButton");
const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");
const loginOverlay = document.getElementById("loginOverlay");
const sectionsTableBody = document.getElementById("sectionsTableBody");
const cashTableBody = document.getElementById("cashTableBody");
const transferTableBody = document.getElementById("transferTableBody");
const sectionModal = document.getElementById("sectionModal");
const receiptModal = document.getElementById("receiptModal");
const sectionForm = document.getElementById("sectionForm");
const receiptForm = document.getElementById("receiptForm");
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const userSettingsForm = document.getElementById("userSettingsForm");
const userSettingsStatus = document.getElementById("userSettingsStatus");
const backupDownloadButton = document.getElementById("backupDownloadButton");
const backupRestoreButton = document.getElementById("backupRestoreButton");
const backupFileInput = document.getElementById("backupFileInput");
const lastBackupBadge = document.getElementById("lastBackupBadge");
const backupStatusMessage = document.getElementById("backupStatusMessage");
const programInfoResetButton = document.getElementById("programInfoResetButton");
const cardSelectors = {
  cashTotal: document.getElementById("cashTotalValue"),
  cashSpending: document.getElementById("cashSpendingValue"),
  cashBalance: document.getElementById("cashBalanceValue"),
  transferTotal: document.getElementById("transferTotalValue"),
  transferSpending: document.getElementById("transferSpendingValue"),
  transferBalance: document.getElementById("transferBalanceValue"),
};

let sections = [];
let receipts = [];
let sectionIdCounter = 0;
let receiptIdCounter = 0;
const DEFAULT_USER_SETTINGS = {
  userName: "admin",
  userPassword: "123456",
  userEmail: "admin@example.com",
};
let userSettings = { ...DEFAULT_USER_SETTINGS };
let lastBackupTimestamp = null;

const STORAGE_KEY = "money_manager_state";
let lastFocusedElement = null;

// Utility functions
function formatDisplayDate(value) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleDateString("ar-LY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatDisplayDateTime(value) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString("ar-LY", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function setStatusMessage(element, message, type = "success") {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("success", "error");
  element.classList.add(type);
}

function showUserSettingsStatus(message, type = "success") {
  setStatusMessage(userSettingsStatus, message, type);
}

function showBackupStatusMessage(message, type = "success") {
  setStatusMessage(backupStatusMessage, message, type);
}

function updateBackupBadge() {
  if (!lastBackupBadge) return;
  lastBackupBadge.textContent = lastBackupTimestamp
    ? formatDisplayDateTime(lastBackupTimestamp)
    : "لا يوجد";
}

function hydrateUserSettingsForm() {
  if (!userSettingsForm) return;
  userSettingsForm.elements.userName.value = userSettings.userName || "";
  userSettingsForm.elements.userEmail.value = userSettings.userEmail || "";
  userSettingsForm.elements.userPassword.value = userSettings.userPassword || "";
}

function populateReportSectionFilter() {
  if (!reportSectionFilter) return;
  const currentValue = reportSectionFilter.value;
  reportSectionFilter.innerHTML = `<option value="all">كل الأقسام</option>`;
  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    reportSectionFilter.appendChild(option);
  });
  if (
    currentValue &&
    (currentValue === "all" ||
      sections.some((section) => section.id === Number(currentValue)))
  ) {
    reportSectionFilter.value = currentValue;
  }
}

// Data management functions
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    userSettings = { ...DEFAULT_USER_SETTINGS };
    sections = [
      {
        id: 1,
        name: "مبيعات كاش",
        type: "revenue",
        receiptType: "cash",
        receiptsCount: 2,
      },
      {
        id: 2,
        name: "مشتريات تحويل",
        type: "expense",
        receiptType: "transfer",
        receiptsCount: 1,
      },
    ];
    receipts = [
      {
        id: 1,
        name: "إيصال مبيعات",
        amount: 6500,
        sectionId: 1,
        kind: "revenue",
        mode: "cash",
        date: "2025-12-12",
        note: "تم صرف",
      },
      {
        id: 2,
        name: "إيصال تسديد",
        amount: 3200,
        sectionId: 1,
        kind: "expense",
        mode: "cash",
        date: "2025-12-05",
        note: "مرتجع",
      },
      {
        id: 3,
        name: "إيصال تحويل",
        amount: 11300,
        sectionId: 2,
        kind: "revenue",
        mode: "transfer",
        date: "2025-12-09",
        note: "دفعة عملاء",
      },
    ];
  } else {
    try {
      const parsed = JSON.parse(saved);
      sections = parsed.sections || [];
      receipts = parsed.receipts || [];
      if (parsed.userSettings) {
        userSettings = {
          ...DEFAULT_USER_SETTINGS,
          ...parsed.userSettings,
        };
      }
      lastBackupTimestamp = parsed.lastBackupTimestamp || null;
    } catch (e) {
      console.error("Failed to parse stored data:", e);
      localStorage.removeItem(STORAGE_KEY);
      loadState();
      return;
    }
  }

  syncIdCounters();
  recalcSectionReceiptCounts();
}

function populateReportSectionFilter() {
  if (!reportSectionFilter) return;
  const currentValue = reportSectionFilter.value;
  reportSectionFilter.innerHTML = `<option value="all">كل الأقسام</option>`;
  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    reportSectionFilter.appendChild(option);
  });
  if (
    currentValue &&
    (currentValue === "all" ||
      sections.some((section) => section.id === Number(currentValue)))
  ) {
    reportSectionFilter.value = currentValue;
  }
}

let receiptModeFilter = null;
const reportFilters = {
  startDate: null,
  endDate: null,
  mode: "all",
  sectionId: "all",
};

function syncIdCounters() {
  sectionIdCounter = sections.reduce(
    (max, section) => Math.max(max, Number(section.id) || 0),
    0
  );
  receiptIdCounter = receipts.reduce(
    (max, receipt) => Math.max(max, Number(receipt.id) || 0),
    0
  );
}

function recalcSectionReceiptCounts() {
  const counts = sections.reduce((acc, section) => {
    acc[section.id] = 0;
    return acc;
  }, {});

  receipts.forEach((receipt) => {
    if (Object.prototype.hasOwnProperty.call(counts, receipt.sectionId)) {
      counts[receipt.sectionId] += 1;
    }
  });

  sections = sections.map((section) => ({
    ...section,
    receiptsCount: counts[section.id] || 0,
  }));
  populateReportSectionFilter();
}

function getNextSectionId() {
  sectionIdCounter += 1;
  return sectionIdCounter;
}

function getNextReceiptId() {
  receiptIdCounter += 1;
  return receiptIdCounter;
}


tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    pages.forEach((page) => page.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

function enterApp() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const { userName, userPassword } = userSettings;
  if (
    !usernameInput.value.trim() ||
    !passwordInput.value.trim() ||
    usernameInput.value.trim() !== userName ||
    passwordInput.value !== userPassword
  ) {
    alert("بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.");
    return;
  }
  loginOverlay.style.display = "none";
}

// Rendering functions
function renderSectionsTable() {
  sectionsTableBody.innerHTML = "";
  sections.forEach((section, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="section-checkbox"
          data-id="${section.id}"
          ${selectedSections.has(section.id) ? "checked" : ""}
          aria-label="تحديد قسم ${section.name}"
        />
      </td>
      <td>${index + 1}</td>
      <td>${section.name}</td>
      <td>${section.type === "revenue" ? "إيراد" : "صرف"}</td>
      <td>${section.receiptType === "cash" ? "كاش" : "تحويل"}</td>
      <td>${section.receiptsCount}</td>
    `;
    sectionsTableBody.appendChild(tr);
  });
  updateSectionSelectAllState();
}

const selectedReceipts = {
  cash: new Set(),
  transfer: new Set(),
};
const selectedSections = new Set();

function renderReceiptsTables() {
  cashTableBody.innerHTML = "";
  transferTableBody.innerHTML = "";

  const cashReceipts = receipts.filter((receipt) => receipt.mode === "cash");
  const transferReceipts = receipts.filter(
    (receipt) => receipt.mode === "transfer"
  );

  cashReceipts.forEach((receipt, index) => {
    const section = sections.find((sec) => sec.id === receipt.sectionId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="receipt-checkbox"
          data-id="${receipt.id}"
          data-mode="cash"
          ${selectedReceipts.cash.has(receipt.id) ? "checked" : ""}
        />
      </td>
      <td>${index + 1}</td>
      <td>${receipt.name}</td>
      <td>${receipt.amount.toLocaleString()} دينار ليبي</td>
      <td>${section?.name || "--"}</td>
      <td>${receipt.date}</td>
      <td>${receipt.note || "-"}</td>
      <td>صورة مرفقة</td>
    `;
    cashTableBody.appendChild(tr);
  });

  transferReceipts.forEach((receipt, index) => {
    const section = sections.find((sec) => sec.id === receipt.sectionId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="checkbox"
          class="receipt-checkbox"
          data-id="${receipt.id}"
          data-mode="transfer"
          ${selectedReceipts.transfer.has(receipt.id) ? "checked" : ""}
        />
      </td>
      <td>${index + 1}</td>
      <td>${receipt.name}</td>
      <td>${receipt.amount.toLocaleString()} دينار ليبي</td>
      <td>${section?.name || "--"}</td>
      <td>${receipt.date}</td>
      <td>${receipt.note || "-"}</td>
      <td>صورة مرفقة</td>
    `;
    transferTableBody.appendChild(tr);
  });
  updateSelectAllState("cash");
  updateSelectAllState("transfer");
  renderReportsTable();
  updateActionButtonsState();
}

function updateSectionSelectAllState() {
  const selectAll = document.querySelector(".select-all-section-checkbox");
  if (!selectAll) return;
  const boxes = document.querySelectorAll(".section-checkbox");
  if (boxes.length === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    return;
  }
  const checkedBoxes = Array.from(boxes).filter((box) => box.checked);
  selectAll.checked = checkedBoxes.length === boxes.length;
  selectAll.indeterminate =
    checkedBoxes.length > 0 && checkedBoxes.length < boxes.length;
}

function clearSectionSelections() {
  selectedSections.clear();
  document.querySelectorAll(".section-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });
  updateSectionSelectAllState();
}

function deleteSelectedSections() {
  if (selectedSections.size === 0) return;
  const sectionIdsToRemove = Array.from(selectedSections);
  sections = sections.filter((section) => !selectedSections.has(section.id));
  receipts = receipts.filter(
    (receipt) => !sectionIdsToRemove.includes(receipt.sectionId)
  );
  selectedSections.clear();
  clearSectionSelections();
  recalcSectionReceiptCounts();
  renderSectionsTable();
  renderReceiptsTables();
  updateSummaryCards();
  persistState();
}

function promptDeleteSelectedSections() {
  if (selectedSections.size === 0) {
    alert("اختر قسمًا واحدًا على الأقل للحذف.");
    return;
  }
  confirmModal.dataset.action = "delete-selected-sections";
  confirmMessage.textContent = `هل تريد حذف ${selectedSections.size} قسمًا وجميع الإيصالات المرتبطة؟`;
  openModal(confirmModal);
}

function updateSummaryCards() {
  const aggregates = {
    cash: { revenue: 0, expense: 0 },
    transfer: { revenue: 0, expense: 0 },
  };

  receipts.forEach((receipt) => {
    const bucket = aggregates[receipt.mode];
    if (!bucket) return;
    const section = sections.find((sec) => sec.id === receipt.sectionId);
    const kind = section?.type || "revenue";
    if (kind === "revenue") {
      bucket.revenue += receipt.amount;
    } else {
      bucket.expense += receipt.amount;
    }
  });

  const cashBalance = aggregates.cash.revenue - aggregates.cash.expense;
  const transferBalance =
    aggregates.transfer.revenue - aggregates.transfer.expense;

  cardSelectors.cashTotal.textContent = `${aggregates.cash.revenue.toLocaleString()} دينار ليبي`;
  cardSelectors.cashSpending.textContent = `${aggregates.cash.expense.toLocaleString()} دينار ليبي`;
  cardSelectors.cashBalance.textContent = `${cashBalance.toLocaleString()} دينار ليبي`;
  cardSelectors.transferTotal.textContent = `${aggregates.transfer.revenue.toLocaleString()} دينار ليبي`;
  cardSelectors.transferSpending.textContent = `${aggregates.transfer.expense.toLocaleString()} دينار ليبي`;
  cardSelectors.transferBalance.textContent = `${transferBalance.toLocaleString()} دينار ليبي`;
}

// Report functions
function renderReportsTable() {
  if (!reportsTableBody) return;
  reportsTableBody.innerHTML = "";
  const data = getFilteredReceipts();
  if (data.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="6" style="text-align:center;color:#8e94a7;">لا توجد بيانات للعرض</td>`;
    reportsTableBody.appendChild(emptyRow);
    return;
  }
  data.forEach((receipt, index) => {
    const section = sections.find((sec) => sec.id === receipt.sectionId);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${receipt.name}</td>
      <td>${receipt.amount.toLocaleString()} دينار ليبي</td>
      <td>${section?.name || "--"}</td>
      <td>${receipt.mode === "cash" ? "كاش" : "تحويل"}</td>
      <td>${formatDisplayDate(receipt.date)}</td>
    `;
    reportsTableBody.appendChild(row);
  });
}

function getFilteredReceipts() {
  return receipts
    .filter((receipt) => {
      if (reportFilters.mode !== "all" && receipt.mode !== reportFilters.mode) {
        return false;
      }
      if (
        reportFilters.sectionId !== "all" &&
        receipt.sectionId !== Number(reportFilters.sectionId)
      ) {
        return false;
      }
      if (reportFilters.startDate) {
        if (new Date(receipt.date) < new Date(reportFilters.startDate)) {
          return false;
        }
      }
      if (reportFilters.endDate) {
        if (new Date(receipt.date) > new Date(reportFilters.endDate)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Modal management functions
function openModal(modal) {
  // احفظ العنصر المركّز حالياً لإرجاع التركيز إليه لاحقاً
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // أغلق أي مودالات مفتوحة حالياً لمنع بقاء التركيز داخل عنصر سيصبح مخفياً
  document.querySelectorAll('.modal[aria-hidden="false"]').forEach((open) => {
    if (open === modal) return;
    const active = document.activeElement;
    if (active && open.contains(active)) {
      try { document.body.focus({ preventScroll: true }); } catch {}
    }
    open.setAttribute('inert', '');
    open.setAttribute('aria-hidden', 'true');
    open.removeAttribute('aria-modal');
  });
  modal.removeAttribute("inert");
  modal.setAttribute("aria-hidden", "false");
  modal.setAttribute("aria-modal", "true");
  // نقل التركيز إلى أول عنصر قابل للتركيز داخل المودال
  const firstFocusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (firstFocusable instanceof HTMLElement) {
    firstFocusable.focus({ preventScroll: true });
  } else if (modal instanceof HTMLElement) {
    modal.focus({ preventScroll: true });
  }
}

function closeModal(modal) {
  // حدد الهدف التالي للتركيز قبل إخفاء المودال
  let nextFocus = (lastFocusedElement instanceof HTMLElement) ? lastFocusedElement : document.body;
  if (nextFocus && modal.contains(nextFocus)) {
    nextFocus = document.body;
  }
  const active = document.activeElement;
  // انقل التركيز خارج المودال أولاً لتجنّب تحذير aria-hidden
  if (active && modal.contains(active)) {
    try { nextFocus.focus({ preventScroll: true }); } catch {}
  }
  // الآن أخفِ المودال واضبط سماته
  modal.setAttribute("inert", "");
  modal.setAttribute("aria-hidden", "true");
  modal.removeAttribute("aria-modal");
  modal.querySelector("form")?.reset();
  // تنظيف مؤشر آخر تركيز
  lastFocusedElement = null;
  // كضمان إضافي، أعد التركيز بعد دورة حدث واحدة
  setTimeout(() => {
    try { (nextFocus || document.body).focus({ preventScroll: true }); } catch {}
  }, 0);
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (target.closest("[data-open-modal]")) {
    const button = target.closest("[data-open-modal]");
    const modalId = button.dataset.openModal;
    const modal = document.getElementById(modalId);
    if (modalId === "receiptModal") {
      receiptModal.dataset.mode = button.dataset.type;
      const title = document.getElementById("receiptModalTitle");
      title.textContent =
        button.dataset.mode === "cash" ? "إضافة إيصال كاش" : "إضافة إيصال تحويل";
      populateSectionOptions(button.dataset.type);
      // فتح إضافة إيصال جديد يلغي وضع التعديل إن وُجد
      delete receiptModal.dataset.editId;
    }
    openModal(modal);
  }

  if (target.hasAttribute("data-close-modal")) {
    const modal = target.closest(".modal");
    closeModal(modal);
  }

  if (target.closest("[data-action='prompt-delete-section']")) {
    if (sections.length === 0) return;
    confirmModal.dataset.action = "delete-section";
    confirmMessage.textContent = "هل تريد حذف آخر قسم؟";
    openModal(confirmModal);
  }

  if (target.closest("[data-action='shortcut-receipt']")) {
    const button = target.closest("[data-action='shortcut-receipt']");
    const mode = button.dataset.mode;
    receiptModal.dataset.mode = mode;
    const title = document.getElementById("receiptModalTitle");
    title.textContent =
      mode === "cash" ? "إضافة إيصال كاش" : "إضافة إيصال تحويل";
    populateSectionOptions(mode);
    // فتح إضافة إيصال جديد يلغي وضع التعديل إن وُجد
    delete receiptModal.dataset.editId;
    openModal(receiptModal);
  }

  if (target.closest("[data-action='shortcut-section']")) {
    openModal(sectionModal);
  }

  if (target.closest("[data-action='remove-receipt']")) {
    const button = target.closest("[data-action='remove-receipt']");
    const mode = button.dataset.type;
    confirmModal.dataset.action = "delete-receipt";
    confirmModal.dataset.mode = mode;
    const selectionCount = selectedReceipts[mode].size;
    confirmMessage.textContent = selectionCount
      ? `هل تريد حذف ${selectionCount} إيصال ${mode === "cash" ? "كاش" : "تحويل"}؟`
      : `هل تريد حذف آخر إيصال ${mode === "cash" ? "كاش" : "تحويل"}؟`;
    openModal(confirmModal);
  }

  // تعديل إيصال
  if (target.closest("[data-action='edit-receipt']")) {
    const button = target.closest("[data-action='edit-receipt']");
    const mode = button.dataset.type;
    // السماح بتحديد إيصال واحد فقط للتعديل
    if (selectedReceipts[mode].size > 1) {
      alert("اختر إيصالاً واحداً فقط للتعديل.");
      return;
    }
    let targetId = null;
    if (selectedReceipts[mode].size === 1) {
      targetId = Array.from(selectedReceipts[mode])[0];
    } else {
      const candidates = receipts.filter((r) => r.mode === mode);
      if (candidates.length === 0) {
        alert("لا توجد إيصالات للتعديل في هذا النوع.");
        return;
      }
      const proceed = window.confirm("لم يتم تحديد إيصال. هل تريد تعديل آخر إيصال في هذا النوع؟");
      if (!proceed) {
        alert("يرجى تحديد إيصال واحد للتعديل.");
        return;
      }
      targetId = candidates[candidates.length - 1].id;
    }
    const rec = receipts.find((r) => r.id === targetId);
    if (!rec) return;
    receiptModal.dataset.mode = mode;
    receiptModal.dataset.editId = String(targetId);
    const title = document.getElementById("receiptModalTitle");
    title.textContent = "تعديل إيصال";
    populateSectionOptions(mode);
    // تعبئة الحقول
    receiptForm.elements.name.value = rec.name || "";
    receiptForm.elements.amount.value = rec.amount != null ? rec.amount : "";
    receiptForm.elements.sectionId.value = rec.sectionId;
    receiptForm.elements.date.value = rec.date || "";
    receiptForm.elements.note.value = rec.note || "";
    openModal(receiptModal);
  }
  if (target.matches(".select-all-checkbox")) {
    const mode = target.dataset.mode;
    const checkboxes = document.querySelectorAll(
      `.receipt-checkbox[data-mode="${mode}"]`
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = target.checked;
      toggleSelection(mode, Number(checkbox.dataset.id), checkbox.checked);
    });
    updateActionButtonsState();
    return;
  }

  if (target.closest("[data-action='delete-sections']")) {
    promptDeleteSelectedSections();
  }
});

function populateSectionOptions(mode = receiptModeFilter) {
  const select = receiptForm.elements.sectionId;
  select.innerHTML = "";
  const filteredSections = sections.filter(
    (section) => !mode || section.receiptType === mode
  );
  filteredSections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = section.name;
    select.appendChild(option);
  });
}

confirmDeleteButton?.addEventListener("click", () => {
  const action = confirmModal.dataset.action;
  if (action === "delete-section") {
    sections.pop();
    renderSectionsTable();
    populateSectionOptions();
  } else if (action === "delete-receipt") {
    const mode = confirmModal.dataset.mode;
    const selected = Array.from(selectedReceipts[mode]);
    if (selected.length > 0) {
      // حذف الإيصالات المحددة
      receipts = receipts.filter((r) => !selected.includes(r.id));
      selectedReceipts[mode].clear();
    } else {
      // حذف آخر إيصال في هذا النوع
      const target = receipts
        .map((receipt, idx) => ({ receipt, idx }))
        .filter((item) => item.receipt.mode === mode);
      if (target.length === 0) {
        closeModal(confirmModal);
        return;
      }
      const { idx } = target[target.length - 1];
      receipts.splice(idx, 1);
    }
    // إعادة حساب العدادات بعد الحذف
    recalcSectionReceiptCounts();
    renderSectionsTable();
    renderReceiptsTables();
    updateSummaryCards();
    updateActionButtonsState();
  } else if (action === "delete-selected-sections") {
    deleteSelectedSections();
  } else if (action === "factory-reset") {
    // إعادة تعيين المصنع
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    // إعادة تهيئة الحالة
    sections = [];
    receipts = [];
    userSettings = { ...DEFAULT_USER_SETTINGS };
    lastBackupTimestamp = null;
    loadState();
    hydrateUserSettingsForm();
    renderSectionsTable();
    renderReceiptsTables();
    updateSummaryCards();
    renderReportsTable();
    updateBackupBadge();
  }
  closeModal(confirmModal);
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches(".receipt-checkbox")) {
    const mode = target.dataset.mode;
    const id = Number(target.dataset.id);
    toggleSelection(mode, id, target.checked);
    updateSelectAllState(mode);
    updateActionButtonsState();
    return;
  }
  if (target.matches(".section-checkbox")) {
    const id = Number(target.dataset.id);
    if (target.checked) {
      selectedSections.add(id);
    } else {
      selectedSections.delete(id);
    }
    updateSectionSelectAllState();
    return;
  }
  if (target.matches(".select-all-section-checkbox")) {
    const checked = target.checked;
    document.querySelectorAll(".section-checkbox").forEach((checkbox) => {
      checkbox.checked = checked;
      const id = Number(checkbox.dataset.id);
      if (checked) {
        selectedSections.add(id);
      } else {
        selectedSections.delete(id);
      }
    });
    updateSectionSelectAllState();
  }
});

// Selection management functions
function toggleSelection(mode, id, isSelected) {
  if (!selectedReceipts[mode]) return;
  if (isSelected) {
    selectedReceipts[mode].add(id);
  } else {
    selectedReceipts[mode].delete(id);
  }
}

function updateSelectAllState(mode) {
  const selectAll = document.querySelector(
    `.select-all-checkbox[data-mode="${mode}"]`
  );
  const boxes = document.querySelectorAll(
    `.receipt-checkbox[data-mode="${mode}"]`
  );
  if (!selectAll || boxes.length === 0) return;
  const checked = Array.from(boxes).filter((box) => box.checked);
  selectAll.checked = checked.length === boxes.length;
  selectAll.indeterminate =
    checked.length > 0 && checked.length < boxes.length;
}

function updateActionButtonsState() {
  const modes = ["cash", "transfer"];
  modes.forEach((mode) => {
    const editBtn = document.querySelector(
      `[data-action='edit-receipt'][data-type='${mode}']`
    );
    const removeBtn = document.querySelector(
      `[data-action='remove-receipt'][data-type='${mode}']`
    );
    const hasReceipts = receipts.some((r) => r.mode === mode);
    const selCount = selectedReceipts[mode]?.size || 0;
    if (editBtn) {
      editBtn.disabled = !hasReceipts; // مفعّل فقط عند وجود إيصالات
    }
    if (removeBtn) {
      removeBtn.disabled = !hasReceipts && selCount === 0; // متاح إذا وُجدت إيصالات
    }
  });
}

receiptForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(receiptForm);
  const sectionId = Number(formData.get("sectionId"));
  const section = sections.find((sec) => sec.id === sectionId);
  if (!section) {
    console.warn("Section not found for receipt submission");
    return;
  }
  const mode = section.receiptType || receiptModal.dataset.mode || "cash";
  const editId = receiptModal.dataset.editId ? Number(receiptModal.dataset.editId) : null;
  if (editId) {
    // تعديل موجود
    const idx = receipts.findIndex((r) => r.id === editId);
    if (idx === -1) {
      console.warn("Edit target receipt not found");
    } else {
      const old = receipts[idx];
      receipts[idx] = {
        ...old,
        name: String(formData.get("name")),
        amount: Number(formData.get("amount")),
        sectionId,
        kind: section.type,
        mode,
        date: String(formData.get("date")),
        note: String(formData.get("note")) || "",
      };
    }
    delete receiptModal.dataset.editId;
  } else {
    // إضافة جديد
    const newReceipt = {
      id: getNextReceiptId(),
      name: formData.get("name"),
      amount: Number(formData.get("amount")),
      sectionId,
      kind: section.type,
      mode,
      date: formData.get("date"),
      note: formData.get("note"),
    };
    receipts.push(newReceipt);
    section.receiptsCount = (section.receiptsCount || 0) + 1;
  }

  renderSectionsTable();
  renderReceiptsTables();
  updateSummaryCards();
  closeModal(receiptModal);
  persistState();
});

sectionForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(sectionForm);
  const newSection = {
    id: getNextSectionId(),
    name: formData.get("name"),
    type: formData.get("type"),
    receiptType: formData.get("receiptType"),
    receiptsCount: 0,
  };
  sections.push(newSection);
  renderSectionsTable();
  populateSectionOptions(receiptModal.dataset.mode || null);
  closeModal(sectionModal);
  persistState();
});

function persistState() {
  const payload = {
    sections,
    receipts,
    userSettings,
    lastBackupTimestamp,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function buildBackupPayload() {
  const timestamp = new Date().toISOString();
  lastBackupTimestamp = timestamp;
  return {
    sections,
    receipts,
    userSettings,
    lastBackupTimestamp: timestamp,
  };
}

function handleBackupDownload() {
  const payload = buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `money-manager-backup-${Date.now()}.json`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  persistState();
  updateBackupBadge();
  showBackupStatusMessage("تم إنشاء النسخة الاحتياطية وتحميلها.", "success");
}

function applyRestoredData(parsed) {
  sections = Array.isArray(parsed.sections) ? parsed.sections : sections;
  receipts = Array.isArray(parsed.receipts) ? parsed.receipts : receipts;
  userSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...(parsed.userSettings || {}),
  };
  lastBackupTimestamp = parsed.lastBackupTimestamp || new Date().toISOString();
  syncIdCounters();
  recalcSectionReceiptCounts();
  hydrateUserSettingsForm();
  renderSectionsTable();
  renderReceiptsTables();
  updateSummaryCards();
  populateSectionOptions(receiptModal.dataset.mode || null);
  renderReportsTable();
  updateBackupBadge();
  persistState();
}

function handleBackupRestoreFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.sections) || !Array.isArray(parsed.receipts)) {
        throw new Error("تنسيق الملف غير صحيح");
      }
      applyRestoredData(parsed);
      showBackupStatusMessage("تم استعادة النسخة الاحتياطية بنجاح.", "success");
    } catch (error) {
      console.error(error);
      showBackupStatusMessage("تعذر قراءة النسخة الاحتياطية، تأكد من الملف.", "error");
    }
  };
  reader.onerror = () => {
    showBackupStatusMessage("حدث خطأ أثناء قراءة الملف.", "error");
  };
  reader.readAsText(file);
}

backupDownloadButton?.addEventListener("click", handleBackupDownload);
backupRestoreButton?.addEventListener("click", () => {
  backupFileInput?.click();
});
backupFileInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  handleBackupRestoreFile(file);
  event.target.value = "";
});

// زر إعادة ضبط البيانات بالكامل (المصنع)
programInfoResetButton?.addEventListener("click", () => {
  confirmModal.dataset.action = "factory-reset";
  confirmMessage.textContent = "هل تريد إعادة ضبط البيانات بالكامل إلى إعدادات المصنع؟";
  openModal(confirmModal);
});

userSettingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(userSettingsForm);
  const updatedSettings = {
    userName: formData.get("userName").trim(),
    userEmail: formData.get("userEmail").trim(),
    userPassword: formData.get("userPassword"),
  };
  if (!updatedSettings.userName || !updatedSettings.userPassword) {
    showUserSettingsStatus("يجب إدخال اسم مستخدم وكلمة مرور صحيحة.", "error");
    return;
  }
  userSettings = {
    ...userSettings,
    ...updatedSettings,
  };
  persistState();
  showUserSettingsStatus("تم حفظ بيانات المستخدم بنجاح.", "success");
});

function handleReportFilterChange() {
  reportFilters.startDate = reportStartDate?.value || null;
  reportFilters.endDate = reportEndDate?.value || null;
  reportFilters.mode = reportModeFilter?.value || "all";
  reportFilters.sectionId = reportSectionFilter?.value || "all";
  renderReportsTable();
}

reportStartDate?.addEventListener("change", handleReportFilterChange);
reportEndDate?.addEventListener("change", handleReportFilterChange);
reportModeFilter?.addEventListener("change", handleReportFilterChange);
reportSectionFilter?.addEventListener("change", handleReportFilterChange);

function buildReportDocument() {
  const data = getFilteredReceipts();
  const sectionName =
    reportFilters.sectionId === "all"
      ? "كل الأقسام"
      : sections.find((sec) => sec.id === Number(reportFilters.sectionId))
          ?.name || "قسم غير محدد";
  const modeName =
    reportFilters.mode === "all"
      ? "كافة الأنواع"
      : reportFilters.mode === "cash"
      ? "إيصالات كاش"
      : "إيصالات تحويلات";
  const reportTitle = "تقرير الحركات المالية";
  const generatedAt = new Date().toLocaleString("ar-LY", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const rowsHtml =
    data
      .map(
        (receipt, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${receipt.name}</td>
        <td>${receipt.amount.toLocaleString()} د.ل</td>
        <td>${sections.find((sec) => sec.id === receipt.sectionId)?.name || "--"}</td>
        <td>${receipt.kind === "revenue" ? "إيراد" : "صرف"}</td>
        <td>${formatDisplayDate(receipt.date)}</td>
      </tr>`
      )
      .join("") ||
    `<tr><td colspan="6" style="text-align:center;">لا توجد بيانات مطابقة للمعايير الحالية</td></tr>`;

  const styles = `
    body { font-family: "Segoe UI", "Cairo", sans-serif; direction: rtl; margin: 40px; color: #111827; }
    .report-header { text-align: center; margin-bottom: 24px; }
    .report-meta { margin-bottom: 16px; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #1f2937; padding: 8px 12px; text-align: center; }
    th { background: #1f2937; color: #fff; }
    tr:nth-child(even) { background: #f4f6fb; }
    .signature { margin-top: 32px; text-align: center; }
    @media print {
      body { margin: 20mm; }
      .print-controls { display: none !important; }
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${reportTitle}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-controls" style="text-align:center; margin-bottom: 16px;">
          <button onclick="window.print()" style="padding:8px 16px;font-size:14px;">طباعة</button>
        </div>
        <div class="report-header">
          <h1>${reportTitle}</h1>
          <p>تاريخ الإصدار: ${generatedAt}</p>
        </div>
        <div class="report-meta">
          <p><strong>نوع البيانات:</strong> ${modeName}</p>
          <p><strong>القسم:</strong> ${sectionName}</p>
          <p><strong>الفترة:</strong> ${
            reportFilters.startDate
              ? formatDisplayDate(reportFilters.startDate)
              : "غير محدد"
          } - ${
    reportFilters.endDate
      ? formatDisplayDate(reportFilters.endDate)
      : "غير محدد"
  }</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>تسلسل</th>
              <th>إسم الإيصال</th>
              <th>المبلغ</th>
              <th>القسم</th>
              <th>النوع</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="signature">
          <div>
            _______________________<br />
            التوقيع
          </div>
        </div>
      </body>
    </html>
  `;

  return { html, reportTitle };
}

exportWordButton?.addEventListener("click", () => {
  const { html } = buildReportDocument();
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `financial-report-${Date.now()}.doc`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

printPreviewButton?.addEventListener("click", () => {
  const { html, reportTitle } = buildReportDocument();
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) {
    alert("الرجاء السماح بالنافذة المنبثقة لمعاينة الطباعة.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = reportTitle;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const openModalEl = document.querySelector('.modal[aria-hidden="false"]');
    if (openModalEl) {
      event.preventDefault();
      closeModal(openModalEl);
    }
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("input[type='search']")) {
    const mode = target.closest(".page").id === "cashPage" ? "cash" : "transfer";
    applySearch(mode, target.value);
  }
});

// Search functions
function applySearch(mode, term) {
  const normalized = term.trim().toLowerCase();
  const tableBody =
    mode === "cash" ? cashTableBody : transferTableBody;
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const nameCell = cells[1]?.textContent?.toLowerCase() || "";
    row.style.display = nameCell.includes(normalized) ? "" : "none";
  });
}

loadState();
hydrateUserSettingsForm();
updateBackupBadge();
renderSectionsTable();
renderReceiptsTables();
updateSummaryCards();
renderReportsTable();
updateActionButtonsState();
