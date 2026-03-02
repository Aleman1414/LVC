import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-accent dark:bg-slate-900">
            <Navbar />
            <main className="flex-1 pb-20 md:pb-0">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
