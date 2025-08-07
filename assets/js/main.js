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