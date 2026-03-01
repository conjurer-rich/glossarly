import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidebarApp } from './sidebar-app';

const root = ReactDOM.createRoot(
  document.getElementById('glossarly-root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <SidebarApp />
  </React.StrictMode>
);
