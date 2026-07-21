import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#C14B33',
          colorInfo: '#C14B33',
          colorBgLayout: '#f6f3ec',
          colorBgContainer: '#fffdf8',
          colorBorder: '#e3dccd',
          colorBorderSecondary: '#ece6d9',
          colorText: '#2b2926',
          colorTextSecondary: '#6f6a60',
          borderRadius: 8,
          fontFamily:
            "'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif",
        },
        components: {
          Layout: { siderBg: '#fffdf8', headerBg: '#fffdf8' },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(193, 75, 51, 0.08)',
            itemSelectedColor: '#C14B33',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
