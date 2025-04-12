'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Calendar, Download, Filter } from 'lucide-react';

// Sample data for charts
const monthlyListingsData = [
  { name: 'Jan', count: 12 },
  { name: 'Feb', count: 19 },
  { name: 'Mar', count: 15 },
  { name: 'Apr', count: 21 },
  { name: 'May', count: 25 },
  { name: 'Jun', count: 30 },
  { name: 'Jul', count: 28 },
  { name: 'Aug', count: 32 },
  { name: 'Sep', count: 27 },
  { name: 'Oct', count: 29 },
  { name: 'Nov', count: 35 },
  { name: 'Dec', count: 40 },
];

const listingTypeData = [
  { name: 'Apartment', value: 45 },
  { name: 'House', value: 30 },
  { name: 'Condo', value: 15 },
  { name: 'Townhouse', value: 10 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Type for the pie chart label props
interface PieLabelProps {
  name: string;
  percent: number;
}

export default function ReportsAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('year');

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !user.isAdmin) {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          <Download size={18} />
          <span>Export Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-2">Total Listings</h3>
          <p className="text-4xl font-bold">248</p>
          <p className="text-sm text-green-600 mt-2">↑ 12% from last month</p>
        </div>
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-2">Active Users</h3>
          <p className="text-4xl font-bold">1,543</p>
          <p className="text-sm text-green-600 mt-2">↑ 8% from last month</p>
        </div>
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-2">Inquiries</h3>
          <p className="text-4xl font-bold">356</p>
          <p className="text-sm text-red-600 mt-2">↓ 3% from last month</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            <h2 className="text-xl font-semibold">Listings Over Time</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className={`px-3 py-1 rounded-md ${timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button 
              className={`px-3 py-1 rounded-md ${timeRange === 'quarter' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
              onClick={() => setTimeRange('quarter')}
            >
              Quarter
            </button>
            <button 
              className={`px-3 py-1 rounded-md ${timeRange === 'year' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
            <button className="flex items-center gap-1 px-3 py-1 border rounded-md hover:bg-accent">
              <Calendar size={16} />
              <span>Custom</span>
            </button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={monthlyListingsData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="New Listings" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={20} className="text-primary" />
            <h2 className="text-xl font-semibold">Listing Types</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={listingTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: PieLabelProps) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {listingTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              <h2 className="text-xl font-semibold">Top Locations</h2>
            </div>
            <button className="flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-accent">
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">New York, NY</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm">85%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Los Angeles, CA</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <span className="text-sm">70%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Chicago, IL</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-sm">65%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Miami, FL</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '55%' }}></div>
                </div>
                <span className="text-sm">55%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Seattle, WA</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-sm">45%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 