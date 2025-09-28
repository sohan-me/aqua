# 🐟 Fish Farming Frontend

A modern Next.js frontend for the Fish Farming Management System, built with TypeScript, Tailwind CSS, and React Query.

## 🚀 Features

- **Modern Dashboard**: Comprehensive overview of all farming operations
- **Pond Management**: View and manage all ponds with detailed information
- **Financial Tracking**: Separate expense and income tracking with categorization
- **Alert System**: Real-time alerts with severity levels and resolution tracking
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Live data updates using React Query
- **Type Safety**: Full TypeScript support for better development experience

## 🛠️ Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications
- **Recharts** - Data visualization (ready for charts)

## 📦 Installation

1. **Navigate to the frontend directory**
   ```bash
   cd fish-farming-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=https://apipremium.sascorporationbd.com/api/fish-farming
   NEXT_PUBLIC_AUTH_URL=https://apipremium.sascorporationbd.com/api/auth
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── ponds/             # Pond management
│   ├── expenses/          # Expense tracking
│   ├── income/            # Income tracking
│   ├── alerts/            # Alert system
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── layout/           # Layout components
│   ├── dashboard/        # Dashboard components
│   └── providers/        # Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and API client
└── config/               # Configuration files
```

## 🎯 Key Components

### Dashboard
- **Stats Overview**: Key metrics and KPIs
- **Recent Activity**: Latest farming activities
- **Quick Actions**: Fast access to common tasks
- **Ponds Overview**: Summary of all ponds
- **Active Alerts**: Critical system alerts

### Pond Management
- **Pond List**: Grid view of all ponds
- **Pond Details**: Detailed pond information
- **Add/Edit Ponds**: Form for pond management

### Financial Tracking
- **Expense Management**: Track all farming expenses
- **Income Management**: Record all income sources
- **Category Filtering**: Filter by expense/income types
- **Financial Summary**: Total expenses, income, and profit/loss

### Alert System
- **Alert Dashboard**: Overview of all alerts
- **Severity Levels**: Critical, High, Medium, Low
- **Alert Resolution**: Mark alerts as resolved
- **Real-time Updates**: Live alert monitoring

## 🔌 API Integration

The frontend integrates with the Django REST API backend:

- **Authentication**: Token-based authentication
- **Data Fetching**: React Query for efficient data management
- **Error Handling**: Comprehensive error handling and user feedback
- **Real-time Updates**: Automatic data refetching and cache invalidation

## 🎨 Design System

- **Color Palette**: Consistent color scheme for different data types
- **Typography**: Clear hierarchy with Inter font
- **Spacing**: Consistent spacing using Tailwind utilities
- **Components**: Reusable components with consistent styling
- **Responsive**: Mobile-first responsive design

## 📱 Responsive Design

- **Mobile**: Optimized for mobile devices
- **Tablet**: Great experience on tablets
- **Desktop**: Full-featured desktop experience
- **Touch-friendly**: Large touch targets for mobile

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Quality

- **ESLint**: Code linting and formatting
- **TypeScript**: Type checking
- **Prettier**: Code formatting (recommended)
- **Husky**: Git hooks for code quality

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## 🔐 Authentication

Currently, the frontend uses a simple token-based authentication system. For production, consider implementing:

- JWT tokens
- Refresh token rotation
- Role-based access control
- Multi-factor authentication

## 📊 Data Visualization

The app is ready for data visualization with Recharts. You can add:

- Financial charts (expense/income trends)
- Water quality graphs
- Growth charts
- Performance dashboards

## 🧪 Testing

To add testing to the project:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the Fish Farming Management System.

## 🆘 Support

For support and questions:
- Check the API documentation at `https://apipremium.sascorporationbd.com/api/docs/`
- Review the backend README for API details
- Open an issue for bugs or feature requests

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**