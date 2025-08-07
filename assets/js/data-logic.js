// 药品管理系统 - 数据逻辑模块
// 提供数据存储、处理和计算的核心功能

const DataLogic = (function() {
    'use strict';
    
    const DB_KEY = 'myDrugSystemData_v3'; // 升级数据版本以支持新特性
    
    // 内部状态
    let state = {
        drugs: [],
        stockRecords: [],
        version: '3.0.0'
    };
    
    // 加载数据
    function loadData() {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                // 数据迁移：确保旧数据兼容新结构
                if (parsedData.drugs && parsedData.stockRecords) {
                    state = parsedData;
                    // 确保每个药品都有必要的字段
                    state.drugs = state.drugs.map(drug => ({
                        ...drug,
                        currentStock: drug.currentStock || 0,
                        isActive: drug.isActive !== undefined ? drug.isActive : true,
                        createdAt: drug.createdAt || new Date().toISOString(),
                        updatedAt: drug.updatedAt || new Date().toISOString()
                    }));
                    // 如果是旧版本数据，重新计算库存
                    if (!parsedData.version || parsedData.version < '3.0.0') {
                        recalculateAllStocks();
                        state.version = '3.0.0';
                        saveData();
                    }
                }
            } catch (e) {
                console.error("解析数据失败", e);
            }
        }
        return state;
    }
    
    // 保存数据
    function saveData() {
        localStorage.setItem(DB_KEY, JSON.stringify(state));
    }
    
    // 获取所有药品（默认只返回活跃的）
    function getDrugs(includeInactive = false) {
        if (includeInactive) {
            return [...state.drugs];
        }
        return state.drugs.filter(drug => drug.isActive);
    }
    
    // 获取所有记录
    function getRecords() {
        return [...state.stockRecords];
    }
    
    // 根据ID获取药品
    function getDrugById(drugId) {
        return state.drugs.find(d => d.id === drugId);
    }
    
    // 添加药品
    function addDrug(name, spec, manufacturer, defaultPrice) {
        if (!name || defaultPrice === '' || isNaN(parseFloat(defaultPrice))) {
            return { success: false, message: '药品名称和参考单价为必填项！' };
        }
        
        const newDrug = {
            id: 'drug_' + Date.now(),
            name,
            spec: spec || '',
            manufacturer: manufacturer || '',
            defaultPrice: parseFloat(defaultPrice),
            currentStock: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        state.drugs.push(newDrug);
        saveData();
        return { success: true, drug: newDrug };
    }
    
    // 软删除药品
    function deleteDrug(drugId) {
        const drug = getDrugById(drugId);
        if (drug) {
            drug.isActive = false;
            drug.updatedAt = new Date().toISOString();
            saveData();
            return { success: true };
        }
        return { success: false, message: '药品不存在' };
    }
    
    // 恢复已删除的药品
    function restoreDrug(drugId) {
        const drug = getDrugById(drugId);
        if (drug) {
            drug.isActive = true;
            drug.updatedAt = new Date().toISOString();
            saveData();
            return { success: true };
        }
        return { success: false, message: '药品不存在' };
    }
    
    // 执行库存操作
    function performStockOperation(drugId, type, quantity, price) {
        if (!drugId || !type || !quantity || quantity <= 0) {
            return { success: false, message: '药品、类型和数量为必填项！' };
        }
        
        const drug = getDrugById(drugId);
        if (!drug) {
            return { success: false, message: '药品不存在！' };
        }
        
        if (type === 'IN' && (price === '' || isNaN(parseFloat(price)))) {
            return { success: false, message: '入库必须填写单价！' };
        }
        
        // 检查出库时库存是否充足
        if (type === 'OUT' && drug.currentStock < quantity) {
            return { success: false, message: `库存不足！当前库存: ${drug.currentStock}` };
        }
        
        // 创建新记录
        const newRecord = {
            recordId: 'rec_' + Date.now(),
            drugId,
            type,
            quantity: parseInt(quantity),
            price: parseFloat(price) || 0,
            timestamp: new Date().toLocaleString('zh-CN')
        };
        
        // 更新药品的当前库存
        if (type === 'IN') {
            drug.currentStock += newRecord.quantity;
        } else {
            drug.currentStock -= newRecord.quantity;
        }
        drug.updatedAt = new Date().toISOString();
        
        state.stockRecords.push(newRecord);
        saveData();
        
        return { success: true, record: newRecord };
    }
    
    // 重新计算所有药品的库存（用于数据迁移）
    function recalculateAllStocks() {
        state.drugs.forEach(drug => {
            drug.currentStock = calculateStockFromRecords(drug.id);
        });
    }
    
    // 从记录计算库存（备用方法）
    function calculateStockFromRecords(drugId) {
        return state.stockRecords.reduce((stock, record) => {
            if (record.drugId === drugId) {
                return stock + (record.type === 'IN' ? record.quantity : -record.quantity);
            }
            return stock;
        }, 0);
    }
    
    // 获取药品最新入库价格
    function getRecentPrice(drugId) {
        const records = state.stockRecords
            .filter(r => r.drugId === drugId && r.type === 'IN' && r.price > 0)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return records.length > 0 ? records[0].price : null;
    }
    
    // 计算统计数据
    function calculateStatistics() {
        const activeDrugs = getDrugs();
        let totalStock = 0;
        let totalValue = 0;
        let lowStockCount = 0;
        
        activeDrugs.forEach(drug => {
            totalStock += drug.currentStock;
            const price = getRecentPrice(drug.id) || drug.defaultPrice;
            totalValue += drug.currentStock * price;
            
            if (drug.currentStock <= 10) {
                lowStockCount++;
            }
        });
        
        // 计算本月统计
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let monthlyIn = 0;
        let monthlyOut = 0;
        
        state.stockRecords.forEach(record => {
            const recordDate = new Date(record.timestamp);
            if (recordDate >= monthStart) {
                if (record.type === 'IN') {
                    monthlyIn += record.quantity;
                } else {
                    monthlyOut += record.quantity;
                }
            }
        });
        
        return {
            totalDrugs: activeDrugs.length,
            totalStock,
            totalValue,
            lowStockCount,
            monthlyIn,
            monthlyOut
        };
    }
    
    // 导出数据（支持CSV格式）
    function exportData(format = 'json') {
        if (format === 'csv') {
            const drugsCSV = exportDrugsToCSV();
            const recordsCSV = exportRecordsToCSV();
            return { drugs: drugsCSV, records: recordsCSV };
        } else {
            return JSON.stringify(state, null, 2);
        }
    }
    
    // 导出药品数据为CSV
    function exportDrugsToCSV() {
        let csv = 'ID,药品名称,规格,生产厂家,参考单价,当前库存,状态\n';
        state.drugs.forEach(drug => {
            const status = drug.isActive ? '正常' : '已删除';
            csv += `"${drug.id}","${drug.name}","${drug.spec || ''}","${drug.manufacturer || ''}",${drug.defaultPrice},${drug.currentStock},"${status}"\n`;
        });
        return csv;
    }
    
    // 导出记录数据为CSV
    function exportRecordsToCSV() {
        let csv = '记录ID,药品ID,药品名称,操作类型,数量,单价,时间\n';
        state.stockRecords.forEach(record => {
            const drug = getDrugById(record.drugId);
            const drugName = drug ? drug.name : '（已删除）';
            const type = record.type === 'IN' ? '入库' : '出库';
            csv += `"${record.recordId}","${record.drugId}","${drugName}","${type}",${record.quantity},${record.price},"${record.timestamp}"\n`;
        });
        return csv;
    }
    
    // 导入数据
    function importData(data, mode = 'replace') {
        try {
            const importedData = typeof data === 'string' ? JSON.parse(data) : data;
            
            if (!importedData.drugs || !importedData.stockRecords) {
                return { success: false, message: '数据格式不正确！' };
            }
            
            if (mode === 'replace') {
                // 替换模式：完全覆盖现有数据
                state = importedData;
                // 确保数据兼容性
                state.drugs = state.drugs.map(drug => ({
                    ...drug,
                    currentStock: drug.currentStock || 0,
                    isActive: drug.isActive !== undefined ? drug.isActive : true,
                    createdAt: drug.createdAt || new Date().toISOString(),
                    updatedAt: drug.updatedAt || new Date().toISOString()
                }));
                recalculateAllStocks();
            } else if (mode === 'merge') {
                // 合并模式：追加新数据
                // 合并药品（避免重复）
                const existingDrugIds = new Set(state.drugs.map(d => d.id));
                importedData.drugs.forEach(drug => {
                    if (!existingDrugIds.has(drug.id)) {
                        state.drugs.push({
                            ...drug,
                            currentStock: drug.currentStock || 0,
                            isActive: drug.isActive !== undefined ? drug.isActive : true,
                            createdAt: drug.createdAt || new Date().toISOString(),
                            updatedAt: drug.updatedAt || new Date().toISOString()
                        });
                    }
                });
                
                // 合并记录
                const existingRecordIds = new Set(state.stockRecords.map(r => r.recordId));
                importedData.stockRecords.forEach(record => {
                    if (!existingRecordIds.has(record.recordId)) {
                        state.stockRecords.push(record);
                    }
                });
                
                // 重新计算所有库存
                recalculateAllStocks();
            }
            
            state.version = '3.0.0';
            saveData();
            return { success: true };
        } catch (error) {
            return { success: false, message: '导入失败：' + error.message };
        }
    }
    
    // 公开API
    return {
        loadData,
        saveData,
        getDrugs,
        getRecords,
        getDrugById,
        addDrug,
        deleteDrug,
        restoreDrug,
        performStockOperation,
        calculateStatistics,
        exportData,
        importData,
        getRecentPrice
    };
})();

// 导出模块（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLogic;
}
