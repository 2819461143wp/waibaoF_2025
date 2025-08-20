<template>
  <div class="system-analysis">
    <!-- 头部标题 -->
    <div class="header">
      <h1>工业设备监控大屏</h1>
      <div class="time">{{ currentTime }}</div>
    </div>

    <!-- 主要指标卡片 -->
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-title">设备总数</div>
        <div class="metric-value">{{ totalDevices }}</div>
        <div class="metric-status normal">全部在线</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">今日产量</div>
        <div class="metric-value">{{ todayProduction }}</div>
        <div class="metric-status">件</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">异常设备</div>
        <div class="metric-value warning">{{ abnormalDevices }}</div>
        <div class="metric-status warning">需关注</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">合格率</div>
        <div class="metric-value">{{ qualityRate }}%</div>
        <div class="metric-status normal">优秀</div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 设备状态监控 -->
      <div class="chart-container device-status">
        <h3>设备实时状态</h3>
        <div class="device-grid">
          <div
            v-for="device in deviceStatus"
            :key="device.id"
            :class="['device-item', device.status]"
          >
            <div class="device-id">设备{{ device.id }}</div>
            <div class="device-params">
              <div>振动: {{ device.vibration }}mm/s</div>
              <div>温度: {{ device.temperature }}℃</div>
              <div>电流: {{ device.current }}A</div>
            </div>
            <div class="device-status-indicator">{{ device.statusText }}</div>
            <div v-if="device.anomalyType" class="anomaly-type">{{ device.anomalyType }}</div>
          </div>
        </div>
      </div>

      <!-- 生产趋势图 -->
      <div class="chart-container production-trend">
        <h3>生产趋势分析</h3>
        <div ref="productionChart" class="chart"></div>
      </div>

      <!-- 异常类型分布 -->
      <div class="chart-container anomaly-distribution">
        <h3>故障类型分布</h3>
        <div ref="anomalyChart" class="chart"></div>
      </div>

      <!-- 维修工单统计 -->
      <div class="chart-container maintenance-stats">
        <h3>维修工单统计</h3>
        <div class="maintenance-list">
          <div v-for="item in maintenanceData" :key="item.id" class="maintenance-item">
            <div class="maintenance-device">设备{{ item.deviceId }}</div>
            <div class="maintenance-desc">{{ item.description }}</div>
            <div class="maintenance-time">{{ item.duration }}h</div>
            <div class="maintenance-status" :class="item.status">{{ item.statusText }}</div>
          </div>
        </div>
      </div>

      <!-- 质量分析 -->
      <div class="chart-container quality-analysis">
        <h3>产品质量分析</h3>
        <div ref="qualityChart" class="chart"></div>
      </div>

      <!-- 点检日志 -->
      <div class="chart-container inspection-log">
        <h3>设备点检日志</h3>
        <div class="inspection-summary">
          <div class="inspection-item">
            <span class="label">今日点检:</span>
            <span class="value">{{ todayInspections }}次</span>
          </div>
          <div class="inspection-item">
            <span class="label">需维护:</span>
            <span class="value warning">{{ needMaintenance }}台</span>
          </div>
          <div class="inspection-item">
            <span class="label">关注设备:</span>
            <span class="value attention">{{ needAttention }}台</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

// 响应式数据
const currentTime = ref('')
const totalDevices = ref(10)
const todayProduction = ref(1256)
const abnormalDevices = ref(3)
const qualityRate = ref(95.2)
const todayInspections = ref(100)
const needMaintenance = ref(1)
const needAttention = ref(2)

// 设备状态数据
const deviceStatus = ref([
  {
    id: '001',
    vibration: 2.5,
    temperature: 45,
    current: 12.5,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '002',
    vibration: 4.8,
    temperature: 52,
    current: 15.2,
    status: 'warning',
    statusText: '异常',
    anomalyType: 'B1-机械失衡故障',
  },
  {
    id: '003',
    vibration: 2.1,
    temperature: 43,
    current: 11.8,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '004',
    vibration: 2.9,
    temperature: 48,
    current: 13.1,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '005',
    vibration: 5.2,
    temperature: 68,
    current: 16.8,
    status: 'error',
    statusText: '故障',
    anomalyType: 'B2-轴承损伤',
  },
  {
    id: '006',
    vibration: 2.3,
    temperature: 44,
    current: 12.2,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '007',
    vibration: 2.7,
    temperature: 58,
    current: 13.5,
    status: 'warning',
    statusText: '异常',
    anomalyType: 'B4-润滑不良',
  },
  {
    id: '008',
    vibration: 2.4,
    temperature: 45,
    current: 12.8,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '009',
    vibration: 2.6,
    temperature: 47,
    current: 13.2,
    status: 'normal',
    statusText: '正常',
    anomalyType: null,
  },
  {
    id: '010',
    vibration: 2.8,
    temperature: 49,
    current: 18.1,
    status: 'critical',
    statusText: '严重',
    anomalyType: 'B5-电机绕组故障',
  },
])

// 维修工单数据
const maintenanceData = ref([
  {
    id: 'M001',
    deviceId: '002',
    description: '机械失衡故障检修',
    duration: 3.5,
    status: 'processing',
    statusText: '进行中',
  },
  {
    id: 'M002',
    deviceId: '005',
    description: '轴承损伤更换',
    duration: 4.5,
    status: 'completed',
    statusText: '已完成',
  },
  {
    id: 'M003',
    deviceId: '007',
    description: '润滑系统维护',
    duration: 2.0,
    status: 'pending',
    statusText: '待处理',
  },
  {
    id: 'M004',
    deviceId: '010',
    description: '电机绕组故障紧急处理',
    duration: 6.0,
    status: 'urgent',
    statusText: '紧急',
  },
])

// 图表引用
const productionChart = ref(null)
const anomalyChart = ref(null)
const qualityChart = ref(null)

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}

// 初始化生产趋势图
const initProductionChart = () => {
  const chart = echarts.init(productionChart.value)

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#1976D2' } },
      axisLabel: { color: '#333' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#1976D2' } },
      axisLabel: { color: '#333' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
    },
    series: [
      {
        name: '产量',
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: { color: '#1976D2', width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(25, 118, 210, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(25, 118, 210, 0.1)',
            },
          ]),
        },
        data: [1200, 1320, 1180, 1450, 1256, 1380, 1290],
      },
    ],
  }

  chart.setOption(option)
}

// 初始化异常分布图
const initAnomalyChart = () => {
  const chart = echarts.init(anomalyChart.value)

  const option = {
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#333' },
    },
    series: [
      {
        name: '故障类型',
        type: 'pie',
        radius: '60%',
        data: [
          { value: 35, name: 'B1-机械失衡故障', itemStyle: { color: '#FF9800' } },
          { value: 25, name: 'B2-轴承损伤', itemStyle: { color: '#F44336' } },
          { value: 20, name: 'B3-电流过载', itemStyle: { color: '#E91E63' } },
          { value: 12, name: 'B4-润滑不良', itemStyle: { color: '#FF5722' } },
          { value: 8, name: 'B5-电机绕组故障', itemStyle: { color: '#9C27B0' } },
        ],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
        },
      },
    ],
  }

  chart.setOption(option)
}

// 初始化质量分析图
const initQualityChart = () => {
  const chart = echarts.init(qualityChart.value)

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['优秀', '良好', '合格', '不合格'],
      axisLine: { lineStyle: { color: '#4CAF50' } },
      axisLabel: { color: '#333' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#4CAF50' } },
      axisLabel: { color: '#333' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
    },
    series: [
      {
        data: [
          { value: 75, itemStyle: { color: '#4CAF50' } },
          { value: 20, itemStyle: { color: '#2196F3' } },
          { value: 3, itemStyle: { color: '#FF9800' } },
          { value: 2, itemStyle: { color: '#F44336' } },
        ],
        type: 'bar',
        barWidth: '50%',
      },
    ],
  }

  chart.setOption(option)
}

// 定时器
let timer = null

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)

  // 初始化图表
  setTimeout(() => {
    initProductionChart()
    initAnomalyChart()
    initQualityChart()
  }, 100)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.system-analysis {
  background: #f5f5f5;
  min-height: 100vh;
  color: #333;
  padding: 20px;
  font-family: 'Microsoft YaHei', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #fff;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(45deg, #1976d2, #4caf50);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.time {
  font-size: 1.2rem;
  color: #1976d2;
  font-weight: 600;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: #fff;
  border-radius: 15px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #1976d2;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.metric-title {
  font-size: 1rem;
  color: #666;
  margin-bottom: 10px;
  font-weight: 500;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1976d2;
  margin-bottom: 5px;
}

.metric-value.warning {
  color: #ff9800;
}

.metric-status {
  font-size: 0.9rem;
  color: #4caf50;
  font-weight: 500;
}

.metric-status.warning {
  color: #ff9800;
}

.metric-status.normal {
  color: #4caf50;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.chart-container {
  background: #fff;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #1976d2;
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #1976d2;
  font-size: 1.3rem;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.device-status {
  grid-column: span 3;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
}

.device-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.device-item.normal {
  border-color: #4caf50;
  background: #e8f5e8;
}

.device-item.warning {
  border-color: #ff9800;
  background: #fff3e0;
}

.device-item.error {
  border-color: #f44336;
  background: #ffebee;
}

.device-item.critical {
  border-color: #9c27b0;
  background: #f3e5f5;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(156, 39, 176, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(156, 39, 176, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(156, 39, 176, 0);
  }
}

.device-id {
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  font-size: 1rem;
}

.device-params {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
}

.device-params div {
  margin-bottom: 2px;
}

.device-status-indicator {
  font-size: 0.9rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.anomaly-type {
  font-size: 0.7rem;
  color: #f44336;
  font-weight: 500;
  background: rgba(244, 67, 54, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
  margin-top: 5px;
}

.chart {
  height: 300px;
}

.maintenance-list {
  max-height: 280px;
  overflow-y: auto;
}

.maintenance-item {
  display: grid;
  grid-template-columns: 1fr 2fr 80px 80px;
  gap: 15px;
  padding: 15px;
  margin-bottom: 12px;
  background: #f8f9fa;
  border-radius: 10px;
  align-items: center;
  border-left: 4px solid #1976d2;
}

.maintenance-device {
  font-weight: bold;
  color: #1976d2;
}

.maintenance-desc {
  color: #666;
}

.maintenance-time {
  color: #4caf50;
  text-align: center;
  font-weight: 600;
}

.maintenance-status {
  text-align: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.maintenance-status.processing {
  background: #e3f2fd;
  color: #1976d2;
}

.maintenance-status.completed {
  background: #e8f5e8;
  color: #4caf50;
}

.maintenance-status.pending {
  background: #fff3e0;
  color: #ff9800;
}

.maintenance-status.urgent {
  background: #ffebee;
  color: #f44336;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.5;
  }
}

.inspection-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.inspection-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.label {
  display: block;
  color: #666;
  margin-bottom: 10px;
  font-weight: 500;
}

.value {
  display: block;
  font-size: 1.8rem;
  font-weight: bold;
  color: #1976d2;
}

.value.warning {
  color: #ff9800;
}

.value.attention {
  color: #2196f3;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .device-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .device-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .device-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .header h1 {
    font-size: 2rem;
  }
}
</style>
