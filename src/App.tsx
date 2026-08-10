/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './lib/auth';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import Elders from './pages/Elders';
import UpaBial from './pages/UpaBial';
import Directory from './pages/Directory';
import Records from './pages/Records';
import Archive from './pages/Archive';
import CommitteePage from './pages/Committee';
import FellowshipPage from './pages/Fellowship';
import Users from './pages/Users';
import Gallery from './pages/Gallery';
import About from './pages/About';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/elders" element={<Elders />} />
            <Route path="/upa-bial" element={<UpaBial />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/committee" element={<CommitteePage />} />
            <Route path="/fellowship" element={<FellowshipPage />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/records" element={<Records />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/users" element={<Users />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
