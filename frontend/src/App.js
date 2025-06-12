/* --- START OF FILE src/App.js --- */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 导入全局和应用级CSS
import './App.css'; 

// 导入组件
import Navigation from './components/Navigation';

// 导入页面
import Home from './pages/Home';
import AllProjects from './pages/AllProjects';
import MyProjects from './pages/MyProjects';
import MyContributions from './pages/MyContributions';

function App() {
  return (
    <Router>
      {/* 导航栏在所有页面都会显示 */}
      <Navigation />
      
      {/* main 标签包裹了会根据路由变化的内容 */}
      <main>
        <Routes>
          {/* 定义每个路径对应的页面组件 */}
          <Route path="/" element={<Home />} />
          <Route path="/all-projects" element={<AllProjects />} />
          <Route path="/my-projects" element={<MyProjects />} />
          <Route path="/my-contributions" element={<MyContributions />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
/* --- END OF FILE src/App.js --- */