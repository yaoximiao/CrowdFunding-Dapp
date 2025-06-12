import { createRouter, createMemoryHistory } from "vue-router";
import { AllProjectView } from "../views/AllProjectView.vue";
import MyPledgedProjectsView from '../views/MyPledgedProjectsView.vue';
import MyCreatedProjectsView from '../views/MyCreatedProjectsView.vue';
import CreateProjectView from '../views/CreateProjectView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';


const routes = [
    {
        path: '/',
        name: 'AllProjects',
        component: AllProjectView,
        alias: '/all-projects' // 可选别名
    },
    {
        path: '/my-pledged',
        name: 'MyPledgedProjects',
        component: MyPledgedProjectsView,
        meta: { requiresAuth: true } // 示例：标记需要用户连接钱包
    },
    {
        path: '/my-created',
        name: 'MyCreatedProjects',
        component: MyCreatedProjectsView,
        meta: { requiresAuth: true }
    },
    {
        path: '/create-project',
        name: 'CreateProject',
        component: CreateProjectView,
        meta: { requiresAuth: true }
    },
    // 项目详情页路由，使用动态参数 projectId
    {
      path: '/project/:projectId',
      name: 'ProjectDetail',
      component: ProjectDetailView,
      props: true // 将路由参数作为 props 传递给组件
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL), // Vite 的基础 URL
    routes,
});

// (可选) 导航守卫，用于检查需要授权的页面
router.beforeEach((to, from, next) => {
    // 假设你的钱包连接状态存储在 Pinia store 或全局状态中
    // const walletStore = useWalletStore(); // 示例
    // if (to.meta.requiresAuth && !walletStore.isConnected) {
    //   next({ name: 'AllProjects' }); // 或跳转到登录/连接提示页
    // } else {
    //   next();
    // }
    // 简化版：暂时先允许所有导航
    next();
});

export default router;