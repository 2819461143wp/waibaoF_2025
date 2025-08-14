<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { userStore } from '@/stores/user'

const store = userStore()

// 状态管理
const uploadLoading = ref(false)
const selectedFiles = ref([])
const selectedCategory = ref('')
const selectedDataType = ref('')

// 数据分类配置
const dataCategories = {
  production: {
    label: '生产数据',
    types: {
      sensor: '传感器数据',
      mes: 'MES生产记录',
    },
  },
  maintenance: {
    label: '运维数据',
    types: {
      repair: '维修工单记录',
      inspection: '设备点检日志',
    },
  },
}

// 计算属性：当前分类的数据类型选项
const currentDataTypes = computed(() => {
  if (!selectedCategory.value) return []
  return Object.entries(dataCategories[selectedCategory.value].types).map(([key, label]) => ({
    value: key,
    label,
  }))
})

// 重置数据类型选择
const resetDataType = () => {
  selectedDataType.value = ''
}

// 文件选择处理
const handleFileChange = (uploadFile) => {
  if (!selectedCategory.value || !selectedDataType.value) {
    ElMessage.error('请先选择数据分类和类型')
    return
  }

  // 检查文件是否已存在
  const existingFile = selectedFiles.value.find((file) => file.originalName === uploadFile.raw.name)
  if (existingFile) {
    ElMessage.warning('该文件已选择')
    return
  }

  const file = {
    id: Date.now() + Math.random(),
    file: uploadFile.raw,
    originalName: uploadFile.raw.name,
    displayName:
      uploadFile.raw.name.substring(0, uploadFile.raw.name.lastIndexOf('.')) || uploadFile.raw.name,
    size: uploadFile.raw.size,
    category: selectedCategory.value,
    dataType: selectedDataType.value,
    isRenaming: false,
  }

  selectedFiles.value.push(file)
  ElMessage.success('文件添加成功')
}

// 删除文件
const removeFile = (fileId) => {
  selectedFiles.value = selectedFiles.value.filter((file) => file.id !== fileId)
}

// 开始重命名
const startRename = (file) => {
  file.isRenaming = true
  file.tempName = file.displayName
}

// 确认重命名
const confirmRename = (file) => {
  if (!file.tempName.trim()) {
    ElMessage.error('文件名不能为空')
    return
  }
  file.displayName = file.tempName.trim()
  file.isRenaming = false
  ElMessage.success('文件名修改成功')
}

// 取消重命名
const cancelRename = (file) => {
  file.isRenaming = false
  delete file.tempName
}

// 获取文件扩展名
const getFileExtension = (fileName) => {
  return fileName.toLowerCase().split('.').pop()
}

// 获取最终文件名
const getFinalFileName = (file) => {
  const extension = getFileExtension(file.originalName)
  return `${file.displayName}.${extension}`
}

// 批量上传文件
const handleBatchUpload = async () => {
  if (selectedFiles.value.length === 0) {
    ElMessage.error('请先选择文件')
    return
  }

  // 检查是否有文件正在重命名
  const renamingFile = selectedFiles.value.find((file) => file.isRenaming)
  if (renamingFile) {
    ElMessage.error('请先完成文件重命名')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要上传 ${selectedFiles.value.length} 个文件吗？`, '确认上传', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
  } catch {
    return
  }

  uploadLoading.value = true
  let successCount = 0
  let failCount = 0

  try {
    for (const fileItem of selectedFiles.value) {
      try {
        const formData = new FormData()

        // 创建重命名后的文件
        const finalFileName = getFinalFileName(fileItem)
        const renamedFile = new File([fileItem.file], finalFileName, {
          type: fileItem.file.type,
        })

        formData.append('file', renamedFile)
        formData.append('operator', String(store.userId))
        formData.append('category', fileItem.category)
        formData.append('dataType', fileItem.dataType)

        await axios.post('/api/device/data/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        successCount++
      } catch (error) {
        console.error(`文件 ${fileItem.displayName} 上传失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功上传 ${successCount} 个文件`)
    }
    if (failCount > 0) {
      ElMessage.error(`${failCount} 个文件上传失败`)
    }

    // 如果全部成功，清空文件列表
    if (failCount === 0) {
      handleReset()
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    ElMessage.error('批量上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 重置所有状态
const handleReset = () => {
  selectedFiles.value = []
  selectedCategory.value = ''
  selectedDataType.value = ''
}

// 清空文件列表
const clearAllFiles = () => {
  selectedFiles.value = []
}
</script>

<template>
  <div class="file-upload">
    <el-card shadow="hover" class="upload-card">
      <template #header>
        <div class="card-header">
          <span>生产设备数据上传</span>
          <el-button
            v-if="selectedFiles.length > 0"
            type="danger"
            size="small"
            @click="clearAllFiles"
          >
            清空全部
          </el-button>
        </div>
      </template>

      <div class="upload-content">
        <!-- 数据分类选择 -->
        <div class="category-section">
          <el-card shadow="never" class="category-card">
            <div class="category-header">
              <span class="section-title">数据分类选择</span>
            </div>

            <el-form :model="{ selectedCategory, selectedDataType }" label-width="120px">
              <el-form-item label="数据大类：" required>
                <el-radio-group v-model="selectedCategory" @change="resetDataType">
                  <el-radio v-for="(category, key) in dataCategories" :key="key" :value="key">
                    {{ category.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="具体类型：" required>
                <el-select
                  v-model="selectedDataType"
                  placeholder="请先选择数据大类"
                  :disabled="!selectedCategory"
                  style="width: 200px"
                >
                  <el-option
                    v-for="type in currentDataTypes"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <!-- 文件上传区域 -->
        <div class="upload-section">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept=".xlsx,.xls,.csv"
            :disabled="!selectedCategory || !selectedDataType"
            multiple
            drag
          >
            <div class="upload-dragger">
              <el-icon class="upload-icon"><upload-filled /></el-icon>
              <div class="upload-text">
                <p v-if="!selectedCategory || !selectedDataType">请先选择数据分类和类型</p>
                <template v-else>
                  <p>将文件拖拽到此处，或<em>点击上传</em></p>
                  <p class="upload-tip">支持 Excel (.xlsx, .xls) 和 CSV 格式，可多选</p>
                  <p class="upload-category">
                    当前分类：{{ dataCategories[selectedCategory]?.label }} -
                    {{ dataCategories[selectedCategory]?.types[selectedDataType] }}
                  </p>
                </template>
              </div>
            </div>
          </el-upload>
        </div>

        <!-- 文件列表 -->
        <div v-if="selectedFiles.length > 0" class="file-list-section">
          <el-divider content-position="left"> 已选择文件 ({{ selectedFiles.length }}) </el-divider>

          <div class="file-list">
            <div v-for="file in selectedFiles" :key="file.id" class="file-item">
              <div class="file-info">
                <el-icon class="file-icon"><document /></el-icon>

                <!-- 文件名显示/编辑 -->
                <div class="file-name-section">
                  <div v-if="!file.isRenaming" class="file-name-display">
                    <span class="file-name" @dblclick="startRename(file)" :title="'双击修改文件名'">
                      {{ getFinalFileName(file) }}
                    </span>
                    <el-tag size="small" type="info">
                      {{ dataCategories[file.category]?.label }} -
                      {{ dataCategories[file.category]?.types[file.dataType] }}
                    </el-tag>
                  </div>

                  <div v-else class="file-name-edit">
                    <el-input
                      v-model="file.tempName"
                      size="small"
                      style="width: 200px"
                      @keyup.enter="confirmRename(file)"
                      @keyup.esc="cancelRename(file)"
                      ref="renameInput"
                    />
                    <span class="file-extension">.{{ getFileExtension(file.originalName) }}</span>
                    <el-button size="small" type="primary" @click="confirmRename(file)">
                      确定
                    </el-button>
                    <el-button size="small" @click="cancelRename(file)"> 取消 </el-button>
                  </div>
                </div>

                <div class="file-meta">
                  <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
              </div>

              <div class="file-actions">
                <el-button
                  v-if="!file.isRenaming"
                  size="small"
                  type="primary"
                  text
                  @click="startRename(file)"
                >
                  重命名
                </el-button>
                <el-button size="small" type="danger" text @click="removeFile(file.id)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            :loading="uploadLoading"
            :disabled="selectedFiles.length === 0"
            @click="handleBatchUpload"
          >
            <el-icon><upload /></el-icon>
            批量上传 ({{ selectedFiles.length }})
          </el-button>

          <el-button
            v-if="selectedFiles.length > 0 || selectedCategory || selectedDataType"
            size="large"
            @click="handleReset"
          >
            重置全部
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.file-upload {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-card {
  flex: 1;
  display: flex !important;
  flex-direction: column;
}

:deep(.upload-card .el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
}

/* 分类选择区域 */
.category-section {
  margin-bottom: 16px;
}

.category-card {
  background: #f8f9fa;
}

.category-header {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 8px;
}

.upload-dragger {
  padding: 15px;
  text-align: center;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  transition: border-color 0.3s;
}

.upload-dragger:hover {
  border-color: #409eff;
}

.upload-icon {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 4px 0;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  font-size: 10px;
  color: #909399;
}

.upload-category {
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}

/* 文件列表 */
.file-list-section {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}

.file-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  font-size: 20px;
  color: #409eff;
}

.file-name-section {
  flex: 1;
}

.file-name-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.file-name:hover {
  background-color: #f0f9ff;
  color: #409eff;
}

.file-name-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-extension {
  color: #909399;
  font-size: 14px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.file-actions {
  display: flex;
  gap: 8px;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* Element Plus 样式覆盖 */
:deep(.el-upload-dragger) {
  width: 100%;
  border: none;
  background: transparent;
}

:deep(.el-upload-dragger:hover) {
  background: transparent;
}

:deep(.el-radio-group .el-radio) {
  margin-right: 24px;
}
</style>
