// 药品管理系统 - 主页面逻辑

document.addEventListener('DOMContentLoaded', () => {
    // 加载数据
    DataLogic.loadData();
    
    // 初始化UI
    initializeUI();
    renderAll();
    
    // 绑定事件
    bindEvents();
});

// 初始化UI
function initializeUI() {
    // 初始化表格排序
    setTimeout(() => {
        UIUtils.TableSort.init('drugTable');
        UIUtils.TableSort.init('recordsTable');
    }, 100);
}

// 绑定事件
function bindEvents() {
    // 添加药品表单
    document.getElementById('addDrugForm').addEventListener('submit', handleAddDrug);
    
    // 库存操作表单
    document.getElementById('stockOpForm').addEventListener('submit', handleStockOperation);
    
    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // 操作类型切换
    document.querySelectorAll('input[name="opType"]').forEach(radio => {
        radio.addEventListener('change', updateOpPriceRequirement);
    });
    
    // 导出数据
    document.getElementById('exportDataBtn').addEventListener('click', handleExportData);
    
    // 导入数据
    document.getElementById('importDataBtn').addEventListener('click', () => {
        document.getElementById('importDataInput').click();
    });
    
    document.getElementById('importDataInput').addEventListener('change', handleImportData);
    
    // 数据恢复
    document.getElementById('dataRecoveryBtn').addEventListener('click', openRecoveryModal);
}

// 处理添加药品
function handleAddDrug(e) {
    e.preventDefault();
    
    const name = document.getElementById('drugName').value.trim();
    const spec = document.getElementById('drugSpec').value.trim();
    const manu = document.getElementById('drugManu').value.trim();
    const price = document.getElementById('drugPrice').value;
    
    const result = DataLogic.addDrug(name, spec, manu, price);
    
    if (result.success) {
        UIUtils.Toast.success('药品添加成功！');
        e.target.reset();
        renderAll();
        
        // 自动选中新添加的药品
        setTimeout(() => {
            document.getElementById('opDrugSelect').value = result.drug.id;
        }, 100);
    } else {
        UIUtils.Toast.error(result.message);
    }
}

// 处理库存操作
function handleStockOperation(e) {
    e.preventDefault();
    
    const drugId = document.getElementById('opDrugSelect').value;
    const type = document.querySelector('input[name="opType"]:checked').value;
    const quantity = document.getElementById('opQuantity').value;
    const price = document.getElementById('opPrice').value;
    
    const result = DataLogic.performStockOperation(drugId, type, quantity, price);
    
    if (result.success) {
        const action = type === 'IN' ? '入库' : '出库';
        UIUtils.Toast.success(`${action}操作成功！`);
        
        e.target.reset();
        document.querySelector('input[name="opType"][value="IN"]').checked = true;
        updateOpPriceRequirement();
        renderAll();
    } else {
        UIUtils.Toast.error(result.message);
    }
}

// 处理搜索
function handleSearch(e) {
    renderDrugTable(e.target.value);
}

// 更新价格输入要求
function updateOpPriceRequirement() {
    const type = document.querySelector('input[name="opType"]:checked').value;
    const opPriceInput = document.getElementById('opPrice');
    opPriceInput.placeholder = (type === 'IN') ? "本次入库单价 (必填)" : "出库价格 (选填)";
    opPriceInput.required = (type === 'IN');
}

// 处理导出数据
function handleExportData() {
    const drugs = DataLogic.getDrugs(true); // 包含已删除的药品
    const records = DataLogic.getRecords();
    
    if (drugs.length === 0 && records.length === 0) {
        UIUtils.Toast.warning("没有数据可以导出。");
        return;
    }
    
    // 获取CSV数据
    const csvData = DataLogic.exportData('csv');
    const date = new Date().toISOString().split('T')[0];
    
    // 创建ZIP文件需要引入额外的库，这里简化处理
    // 分别下载两个CSV文件
    
    // 下载药品数据
    const drugsBlob = new Blob(['\ufeff' + csvData.drugs], { type: 'text/csv;charset=utf-8;' });
    const drugsUrl = URL.createObjectURL(drugsBlob);
    const drugsLink = document.createElement('a');
    drugsLink.href = drugsUrl;
    drugsLink.download = `药品清单_${date}.csv`;
    document.body.appendChild(drugsLink);
    drugsLink.click();
    document.body.removeChild(drugsLink);
    URL.revokeObjectURL(drugsUrl);
    
    // 延迟下载流水记录
    setTimeout(() => {
        const recordsBlob = new Blob(['\ufeff' + csvData.records], { type: 'text/csv;charset=utf-8;' });
        const recordsUrl = URL.createObjectURL(recordsBlob);
        const recordsLink = document.createElement('a');
        recordsLink.href = recordsUrl;
        recordsLink.download = `出入库流水_${date}.csv`;
        document.body.appendChild(recordsLink);
        recordsLink.click();
        document.body.removeChild(recordsLink);
        URL.revokeObjectURL(recordsUrl);
        
        UIUtils.Toast.success('数据导出成功！');
    }, 500);
}

// 处理导入数据
function handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // 显示导入选项对话框
        UIUtils.Modal.create({
            title: '数据导入选项',
            content: `
                <p>请选择导入方式：</p>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="radio" name="importMode" value="replace" checked> 
                        <strong>覆盖模式</strong> - 完全替换现有数据
                    </label>
                    <label style="display: block;">
                        <input type="radio" name="importMode" value="merge"> 
                        <strong>合并模式</strong> - 将新数据追加到现有数据
                    </label>
                </div>
            `,
            confirmText: '导入',
            onConfirm: () => {
                const mode = document.querySelector('input[name="importMode"]:checked').value;
                const result = DataLogic.importData(e.target.result, mode);
                
                if (result.success) {
                    UIUtils.Toast.success('数据导入成功！');
                    renderAll();
                    return true;
                } else {
                    UIUtils.Toast.error(result.message);
                    return false;
                }
            }
        });
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// 删除药品
function deleteDrug(drugId) {
    const drug = DataLogic.getDrugById(drugId);
    if (!drug) return;
    
    UIUtils.Modal.confirm(
        `确定要删除药品"${drug.name}"吗？<br><small style="color: #666;">删除后可以在数据管理中恢复</small>`,
        () => {
            const result = DataLogic.deleteDrug(drugId);
            if (result.success) {
                UIUtils.Toast.success('药品已删除');
                renderAll();
            }
            return true;
        }
    );
}

// 渲染所有内容
function renderAll(filter = '') {
    updateDrugSelector();
    renderDrugTable(filter);
    renderRecordsTable();
    updateStatistics();
}

// 更新药品选择器
function updateDrugSelector() {
    const select = document.getElementById('opDrugSelect');
    const drugs = DataLogic.getDrugs();
    
    select.innerHTML = '<option value="">--请选择药品--</option>';
    drugs.forEach(drug => {
        const option = document.createElement('option');
        option.value = drug.id;
        option.textContent = `${drug.name} (${drug.spec || '无规格'})`;
        select.appendChild(option);
    });
}

// 渲染药品表格
function renderDrugTable(filter = '') {
    const tableBody = document.getElementById('drugTableBody');
    const drugs = DataLogic.getDrugs();
    const lowerCaseFilter = filter.toLowerCase();
    
    tableBody.innerHTML = '';
    
    const filteredDrugs = drugs.filter(drug => 
        drug.name.toLowerCase().includes(lowerCaseFilter) ||
        (drug.manufacturer && drug.manufacturer.toLowerCase().includes(lowerCaseFilter))
    );
    
    if (filteredDrugs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">没有找到匹配的药品</td></tr>';
        return;
    }
    
    filteredDrugs.forEach(drug => {
        const row = document.createElement('tr');
        const stockClass = drug.currentStock <= 10 ? 'warning-stock' : '';
        
        row.innerHTML = `
            <td>${drug.name}</td>
            <td>${drug.spec || '-'}</td>
            <td>${drug.manufacturer || '-'}</td>
            <td class="${stockClass}">${drug.currentStock}</td>
            <td><button class="btn-danger" onclick="deleteDrug('${drug.id}')">删除</button></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 渲染记录表格
function renderRecordsTable() {
    const tableBody = document.getElementById('recordsTableBody');
    const records = DataLogic.getRecords();
    
    tableBody.innerHTML = '';
    
    // 显示最近100条记录
    const recentRecords = [...records].reverse().slice(0, 100);
    
    if (recentRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">暂无出入库记录</td></tr>';
        return;
    }
    
    recentRecords.forEach(record => {
        const drug = DataLogic.getDrugById(record.drugId);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${record.timestamp}</td>
            <td>${drug ? drug.name : '（已删除）'}</td>
            <td>${record.type === 'IN' ? '入库' : '出库'}</td>
            <td>${record.quantity}</td>
            <td>${record.price > 0 ? record.price.toFixed(2) : '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 更新统计数据
function updateStatistics() {
    const stats = DataLogic.calculateStatistics();
    
    document.getElementById('totalDrugs').textContent = stats.totalDrugs;
    document.getElementById('totalStock').textContent = stats.totalStock;
    document.getElementById('totalValue').textContent = stats.totalValue.toFixed(2);
    document.getElementById('lowStockCount').textContent = stats.lowStockCount;
}

// 将删除函数暴露到全局作用域
window.deleteDrug = deleteDrug;

// ===== 数据恢复功能 =====

let currentPreviewKey = '';

// 打开数据恢复模态框
function openRecoveryModal() {
    document.getElementById('recoveryModal').style.display = 'block';
    scanStorageData();
}

// 关闭数据恢复模态框
function closeRecoveryModal() {
    document.getElementById('recoveryModal').style.display = 'none';
    document.getElementById('recoveryDataTable').style.display = 'none';
    document.getElementById('scanStatus').innerHTML = '';
}

// 关闭数据预览模态框
function closePreviewModal() {
    document.getElementById('dataPreviewModal').style.display = 'none';
}

// 扫描localStorage中的数据
function scanStorageData() {
    const statusDiv = document.getElementById('scanStatus');
    const tableDiv = document.getElementById('recoveryDataTable');
    const tbody = document.getElementById('recoveryDataTableBody');
    
    statusDiv.innerHTML = '正在扫描...';
    
    let foundData = [];
    
    // 扫描所有localStorage键
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const data = localStorage.getItem(key);
        
        try {
            const parsed = JSON.parse(data);
            let drugCount = 0;
            let recordCount = 0;
            let dataType = '未知';
            
            // 检查是否是药品管理数据
            if (parsed.drugs && Array.isArray(parsed.drugs)) {
                drugCount = parsed.drugs.length;
                dataType = '药品管理数据';
            }
            if (parsed.stockRecords && Array.isArray(parsed.stockRecords)) {
                recordCount = parsed.stockRecords.length;
            }
            
            // 如果包含药品或记录数据，或键名包含drug相关字符
            if (drugCount > 0 || recordCount > 0 || 
                key.toLowerCase().includes('drug') || 
                key.toLowerCase().includes('medicine')) {
                foundData.push({
                    key: key,
                    type: dataType,
                    drugs: drugCount,
                    records: recordCount,
                    size: data.length,
                    data: data,
                    version: parsed.version || '未知'
                });
            }
        } catch (e) {
            // 如果键名包含drug相关字符，也添加到列表（可能是其他格式的数据）
            if (key.toLowerCase().includes('drug') || key.toLowerCase().includes('medicine')) {
                foundData.push({
                    key: key,
                    type: '文本数据',
                    drugs: 0,
                    records: 0,
                    size: data.length,
                    data: data,
                    version: '不适用'
                });
            }
        }
    }
    
    if (foundData.length > 0) {
        statusDiv.innerHTML = `✅ 找到 ${foundData.length} 个相关数据`;
        statusDiv.style.color = 'green';
        
        tbody.innerHTML = '';
        foundData.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.key}</td>
                <td>${item.type}</td>
                <td>${item.drugs}</td>
                <td>${item.records}</td>
                <td>${(item.size / 1024).toFixed(2)} KB</td>
                <td>
                    <button onclick="previewStorageData('${item.key}')" class="btn-secondary">预览</button>
                    ${item.type === '药品管理数据' ? `<button onclick="restoreStorageData('${item.key}')" style="margin-left: 5px;">恢复</button>` : ''}
                </td>
            `;
        });
        
        tableDiv.style.display = 'block';
    } else {
        statusDiv.innerHTML = '❌ 未找到任何药品管理相关数据';
        statusDiv.style.color = 'red';
        tableDiv.style.display = 'none';
    }
}

// 预览存储数据
function previewStorageData(key) {
    const data = localStorage.getItem(key);
    const modal = document.getElementById('dataPreviewModal');
    const title = document.getElementById('previewTitle');
    const previewDiv = document.getElementById('previewData');
    const restoreBtn = document.getElementById('previewRestoreBtn');
    
    currentPreviewKey = key;
    title.textContent = `数据预览: ${key}`;
    
    try {
        const parsed = JSON.parse(data);
        
        let previewText = '';
        previewText += `存储键: ${key}\n`;
        previewText += `数据大小: ${(data.length / 1024).toFixed(2)} KB\n`;
        previewText += `数据版本: ${parsed.version || '未知'}\n\n`;
        
        if (parsed.drugs && Array.isArray(parsed.drugs)) {
            previewText += `=== 药品数据 (${parsed.drugs.length}种) ===\n`;
            parsed.drugs.slice(0, 5).forEach(drug => {
                previewText += `• ${drug.name || '未知药品'} (${drug.spec || '无规格'}) - 库存: ${drug.currentStock || 0}\n`;
            });
            if (parsed.drugs.length > 5) {
                previewText += `... 还有 ${parsed.drugs.length - 5} 种药品\n`;
            }
            previewText += '\n';
        }
        
        if (parsed.stockRecords && Array.isArray(parsed.stockRecords)) {
            previewText += `=== 库存记录 (${parsed.stockRecords.length}条) ===\n`;
            parsed.stockRecords.slice(0, 5).forEach(record => {
                const type = record.type === 'IN' ? '入库' : '出库';
                previewText += `• ${record.timestamp || '未知时间'} - ${type} ${record.quantity || 0}个\n`;
            });
            if (parsed.stockRecords.length > 5) {
                previewText += `... 还有 ${parsed.stockRecords.length - 5} 条记录\n`;
            }
        }
        
        // 如果数据看起来是完整的药品管理数据，显示恢复按钮
        if (parsed.drugs && parsed.stockRecords) {
            restoreBtn.style.display = 'inline-block';
        } else {
            restoreBtn.style.display = 'none';
        }
        
        previewDiv.textContent = previewText;
    } catch (e) {
        // 显示原始数据预览
        const preview = data.length > 1000 ? data.substring(0, 1000) + '...\n\n(数据过长，仅显示前1000字符)' : data;
        previewDiv.textContent = `存储键: ${key}\n数据大小: ${(data.length / 1024).toFixed(2)} KB\n数据类型: 文本数据\n\n原始内容:\n${preview}`;
        restoreBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// 恢复存储数据
function restoreStorageData(key = null) {
    const keyToRestore = key || currentPreviewKey;
    
    if (!keyToRestore) {
        UIUtils.Toast.show('没有指定要恢复的数据', 'error');
        return;
    }
    
    if (confirm(`确定要恢复数据 "${keyToRestore}" 吗？这将覆盖当前的药品管理数据！`)) {
        const data = localStorage.getItem(keyToRestore);
        if (data) {
            const DB_KEY = 'myDrugSystemData_v3';
            localStorage.setItem(DB_KEY, data);
            UIUtils.Toast.show('数据恢复成功！', 'success');
            closePreviewModal();
            closeRecoveryModal();
            
            // 重新加载数据并刷新界面
            setTimeout(() => {
                DataLogic.loadData();
                renderAll();
            }, 500);
        } else {
            UIUtils.Toast.show('恢复失败：数据不存在', 'error');
        }
    }
}

// 绑定恢复按钮事件
document.addEventListener('DOMContentLoaded', function() {
    // 为预览模态框的恢复按钮绑定事件
    document.getElementById('previewRestoreBtn').addEventListener('click', function() {
        restoreStorageData();
    });
    
    // 点击模态框背景关闭
    document.getElementById('recoveryModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeRecoveryModal();
        }
    });
    
    document.getElementById('dataPreviewModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closePreviewModal();
        }
    });
});

// 将数据恢复函数暴露到全局作用域
window.openRecoveryModal = openRecoveryModal;
window.closeRecoveryModal = closeRecoveryModal;
window.closePreviewModal = closePreviewModal;
window.scanStorageData = scanStorageData;
window.previewStorageData = previewStorageData;
window.restoreStorageData = restoreStorageData;