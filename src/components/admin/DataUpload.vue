<script setup>
import { ref, computed } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { read, utils, writeFileXLSX, writeFile } from "xlsx";
import axios from "axios";
import { userStore } from "@/stores/user";

const store = userStore();

// 状态管理
const importLoading = ref(false);
const previewData = ref([]);
const excelHeaders = ref([]);
const rowErrors = ref({});
const operator = ref(String(store.userId));
const originalFile = ref(null);
const fileName = ref("");

const SAMPLE_HEADERS = [
  "timestamp",
  "device_id",
  "vibration",
  "temperature",
  "current",
  "abnormal_type",
];
// 数值型字段校验
const NUMBER_FIELDS = new Set(["vibration", "temperature", "current"]);

// 校验规则
const validationRules = {
  timestamp: (v) => {
    if (!v?.trim()) return "timestamp不能为空";
    // 尝试匹配多种常见格式，或直接用Date.parse
    if (isNaN(Date.parse(v))) return "请输入有效的日期时间格式";
    return true;
  },
  device_id: (v) => !!v?.trim() || "device_id不能为空",
  abnormal_type: (v) => !!v?.trim() || "abnormal_type不能为空",
  ...Array.from(NUMBER_FIELDS).reduce((acc, field) => {
    acc[field] = (v) => {
      if (!v && v !== 0) return true; // 允许空值
      const num = Number(v);
      if (isNaN(num)) return `${field}必须为数字`;
      return true;
    };
    return acc;
  }, {}),
};

// 计算属性
const hasValidationErrors = computed(
  () => Object.keys(rowErrors.value).length > 0,
);

const validationErrors = computed(() => Object.values(rowErrors.value).flat());

// CSV解析函数
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
};

// 文件处理
const handleFileChange = async (uploadFile) => {
  const loading = ElLoading.service({ lock: true });
  try {
    // 保存原始文件供后续上传使用
    originalFile.value = uploadFile.raw;
    // 基于原始文件名（去除扩展名）设置默认的上传文件名
    const rawFileName = uploadFile.raw.name;
    fileName.value = rawFileName.substring(0, rawFileName.lastIndexOf('.')) || rawFileName;

    let jsonData;
    const fileExtension = rawFileName.toLowerCase().split('.').pop();

    if (fileExtension === 'csv') {
      // 处理CSV文件
      const text = await uploadFile.raw.text();
      jsonData = parseCSV(text);
    } else {
      // 处理Excel文件
      const data = await uploadFile.raw.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      jsonData = utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      });
    }

    // 表头校验
    if (!arraysEqual(jsonData[0], SAMPLE_HEADERS)) {
      ElMessage.error("文件列头与模板不一致");
      previewData.value = [];
      return;
    }

    excelHeaders.value = jsonData[0];
    previewData.value = jsonData.slice(1).map((row, index) => {
      const item = excelHeaders.value.reduce((obj, header, i) => {
        obj[header] = (row[i] ?? "").toString().trim();
        return obj;
      }, {});
      validateRow(item, index);
      return item;
    });
  } catch (error) {
    ElMessage.error(`文件解析失败: ${error.message}`);
  } finally {
    loading.close();
  }
};

// 提交导入
const handleImport = async () => {
  importLoading.value = true;
  try {
    if (!originalFile.value) {
      ElMessage.error("请先选择文件");
      return;
    }

    if (hasValidationErrors.value) {
      ElMessage.error("请先修正数据错误");
      return;
    }

    const formData = new FormData();
    // 使用用户指定的文件名，如果为空则使用原始文件名
    const originalExtension = originalFile.value.name.toLowerCase().split('.').pop();
    const finalFileName = fileName.value.trim() 
      ? `${fileName.value.trim()}.${originalExtension}` 
      : originalFile.value.name;
    const renamedFile = new File([originalFile.value], finalFileName, { type: originalFile.value.type });

    formData.append("file", renamedFile);
    formData.append("operator", operator.value || String(store.userId));

    const response = await axios.post("/api/device/data/upload", formData);
    ElMessage.success(`成功导入 ${response.data.count} 条数据`);
    previewData.value = [];
    originalFile.value = null;
  } catch (error) {
    console.error("导入失败详情:", error);
    const msg = error.response?.data?.error || error.message;
    ElMessage.error(`导入失败: ${msg}`);
  } finally {
    importLoading.value = false;
  }
};

// 辅助方法：严格比较数组
const arraysEqual = (a, b) => {
  if (a?.length !== b?.length) return false;
  return a.every((val, index) => val === b[index]);
};

// 修改后的校验方法
const validateRow = (row, rowIndex) => {
  const errors = [];
  // 遍历所有字段
  excelHeaders.value.forEach((header) => {
    const validator = validationRules[header];
    if (validator) {
      const result = validator(row[header]);
      if (result !== true) errors.push(result);
    }
  });

  // 检查是否存在额外字段
  const extraFields = Object.keys(row).filter(
    (key) => !excelHeaders.value.includes(key),
  );
  if (extraFields.length) {
    errors.push(`存在额外字段：${extraFields.join(", ")}`);
  }

  if (errors.length) {
    rowErrors.value[rowIndex] = errors;
  } else {
    delete rowErrors.value[rowIndex];
  }
};

// 下载Excel模板
const downloadExcelTemplate = () => {
  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet([SAMPLE_HEADERS]);
  utils.book_append_sheet(workbook, worksheet, "生产数据");
  writeFileXLSX(workbook, "生产数据模板.xlsx");
};

// 下载CSV模板
const downloadCSVTemplate = () => {
  const csvContent = SAMPLE_HEADERS.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', '生产数据模板.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 导出当前数据为Excel
const exportCurrentDataAsExcel = () => {
  if (previewData.value.length === 0) {
    ElMessage.warning("没有数据可导出");
    return;
  }
  
  const workbook = utils.book_new();
  const data = [excelHeaders.value, ...previewData.value.map(row => 
    excelHeaders.value.map(header => row[header] || '')
  )];
  const worksheet = utils.aoa_to_sheet(data);
  utils.book_append_sheet(workbook, worksheet, "生产数据");
  writeFileXLSX(workbook, `${fileName.value || '导出数据'}.xlsx`);
};

// 导出当前数据为CSV
const exportCurrentDataAsCSV = () => {
  if (previewData.value.length === 0) {
    ElMessage.warning("没有数据可导出");
    return;
  }
  
  const csvRows = [excelHeaders.value];
  previewData.value.forEach(row => {
    csvRows.push(excelHeaders.value.map(header => {
      const value = row[header] || '';
      // 如果值包含逗号、引号或换行符，需要用引号包围并转义
      if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value;
    }));
  });
  
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName.value || '导出数据'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<template>
  <div class="excel-import-export">
    <el-card shadow="hover" class="flex-card">
      <template #header>
        <div class="card-header">
          <span>生产设备信息导入</span>
          <div class="header-actions">
            <el-button-group>
              <el-button type="primary" link @click="downloadExcelTemplate">
                下载Excel模板
              </el-button>
              <el-button type="primary" link @click="downloadCSVTemplate">
                下载CSV模板
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept=".xlsx,.xls,.csv"
      >
        <template #trigger>
          <el-button type="primary" :loading="importLoading">
            选择文件 (Excel/CSV)
          </el-button>
        </template>

        <el-button
          type="success"
          :disabled="!previewData.length || hasValidationErrors"
          @click="handleImport"
          :loading="importLoading"
          class="ml-2"
        >
          确认导入
        </el-button>

        <el-input
          v-model="fileName"
          placeholder="请输入上传文件名（可选）"
          class="ml-2"
          style="width: 220px"
        />
      </el-upload>

      <!-- 导出按钮组 -->
      <div v-if="previewData.length" class="export-actions mt-2">
        <span class="export-label">导出当前数据：</span>
        <el-button-group>
          <el-button type="info" size="small" @click="exportCurrentDataAsExcel">
            导出Excel
          </el-button>
          <el-button type="info" size="small" @click="exportCurrentDataAsCSV">
            导出CSV
          </el-button>
        </el-button-group>
      </div>

      <!-- 数据预览 & 编辑 -->
      <div v-if="previewData.length" class="mt-4">
        <el-alert
          v-if="hasValidationErrors"
          type="error"
          show-icon
          class="mb-2"
        >
          存在 {{ validationErrors.length }} 条数据校验错误，请修正后再提交！
        </el-alert>

        <el-table :data="previewData" border height="900px">
          <el-table-column
            v-for="(header, index) in excelHeaders"
            :key="index"
            :prop="header"
            :label="header"
          >
            <template #default="{ row, $index }">
              <el-input
                v-model="row[header]"
                @change="validateRow(row, $index)"
                :class="{ 'error-cell': rowErrors[$index]?.includes(header) }"
              />
            </template>
          </el-table-column>

          <el-table-column label="错误信息" width="200">
            <template #default="{ $index }">
              <div v-if="rowErrors[$index]" class="error-messages">
                <el-tag
                  v-for="(error, i) in rowErrors[$index]"
                  :key="i"
                  type="danger"
                  size="small"
                >
                  {{ error }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.export-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-label {
  font-size: 14px;
  color: #606266;
}

.left-actions {
  display: flex;
  gap: 8px;
}

.error-cell :deep(.el-input__inner) {
  border-color: #ff4d4f !important;
  background-color: #fff2f0 !important;
}

.error-messages {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.excel-import-export {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flex-card {
  flex: 1;
  display: flex !important;
  flex-direction: column;
  min-height: 0;
}

:deep(.flex-card .el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

:deep(.el-table) {
  flex: 1;
  margin-bottom: 16px;
}
</style>