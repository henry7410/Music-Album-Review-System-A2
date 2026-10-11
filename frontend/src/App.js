import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Catalogue from './pages/Catalogue';
import AlbumDetail from './pages/AlbumDetail';
import ProtectedRoute from './components/ProtectedRoute';
import RedirectIfAuthenticated from './components/RedirectIfAuthenticated';
import RequireAdmin from './components/RequireAdmin';
import AlbumForm from './pages/AlbumForm';
import Account from './pages/Account';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Catalogue />} />
          <Route path="/account" element={<Account />} />
          <Route path="/albums/:id" element={<AlbumDetail />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/albums/new" element={<AlbumForm />} />
            <Route path="/admin/albums/:id/edit" element={<AlbumForm />} />
          </Route>
        </Route>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
