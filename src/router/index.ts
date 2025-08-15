import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/Login.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/components/Register.vue'),
    },
    {
      path: '/layout',
      name: 'layout',
      component: () => import('@/components/layout/layout.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/components/admin/Admin.vue'),
      children: [
        {
          path: 'system/analysis',
          name: 'systemAnalysis',
          component: () => import('@/components/admin/SystemAnalysis.vue'),
        },
        {
          path: 'user/insert',
          name: 'userInsert',
          component: () => import('@/components/admin/UserInsert.vue'),
        },
        {
          path: 'user/update',
          name: 'userUpdate',
          component: () => import('@/components/admin/UserUpdate.vue'),
        },
        {
          path: 'device/upload',
          name: 'admin-device-upload',
          component: () => import('@/components/admin/DataUpload.vue'),
        },
        {
          path: 'model/train',
          name: 'modelTrain',
          component: () => import('@/components/admin/ModelTrain.vue'),
        },
        {
          path: 'model/predict',
          name: 'modelPredict',
          component: () => import('@/components/admin/ModelPredict.vue'),
        },
      ],
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/components/Home.vue'),
    },
  ],
})

export default router
