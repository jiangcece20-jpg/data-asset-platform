/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌主色：与设计稿 / Arco Design arcoblue 同源
        brand: {
          50: '#E8F3FF',
          100: '#BEDAFF',
          200: '#94BFFF',
          300: '#6AA1FF',
          400: '#4080FF',
          500: '#165DFF',
          600: '#0E42D2',
          700: '#072CA6',
          800: '#031A75',
          900: '#000D47'
        },
        // 中性色（Arco gray 体系）
        ink: {
          100: '#F7F8FA',
          200: '#F2F3F5',
          300: '#E5E6EB',
          400: '#C9CDD4',
          500: '#86909C',
          600: '#4E5969',
          700: '#272E3B',
          900: '#1D2129'
        },
        success: {
          50: '#E8FFEA',
          100: '#AFF0B5',
          500: '#00B42A',
          600: '#009A29'
        },
        warning: {
          50: '#FFF7E8',
          100: '#FFE8BA',
          500: '#FF7D00',
          600: '#D25F00'
        },
        danger: {
          50: '#FFECE8',
          100: '#FDCDC5',
          500: '#F53F3F',
          600: '#CB272D'
        },
        // 科技/AI 强调色：蓝紫系（与 App 端 AI 找数机器人渐变同源）
        violet: {
          50: '#F4F1FF',
          100: '#E6DEFF',
          200: '#CBBEFF',
          300: '#A88FFB',
          400: '#9170F8',
          500: '#7B5CF6',
          600: '#6039E8',
          700: '#4A2BB8'
        },
        // VIP 营销色（克制使用）
        vip: {
          gold: '#B8860B',
          rose: '#C49F99'
        }
      },
      boxShadow: {
        card: '0 2px 8px rgba(29, 33, 41, 0.06)',
        'card-hover': '0 4px 16px rgba(22, 93, 255, 0.10)',
        'card-hover-violet': '0 4px 16px rgba(123, 92, 246, 0.14)',
        float: '0 8px 32px rgba(29, 33, 41, 0.12)'
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"',
          '"Helvetica Neue"', '"Microsoft YaHei"', '"Segoe UI"', 'sans-serif'
        ]
      }
    }
  },
  plugins: []
}
