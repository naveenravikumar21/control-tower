import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Pencil, Trash2, Check, X, Shield, User } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth, useToast } from '../contexts';
import { Button, Input, Modal, Card, Badge, SearchInput, EmptyState } from '../components/ui';
import { formatDate } from '../utils';

export const Users = () => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user'
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.list('users');
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            addToast('Failed to load users: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filter users based on search
    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            user.email?.toLowerCase().includes(query) ||
            user.name?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        );
    });

    // Open modal for creating/editing
    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                email: user.email || '',
                password: '', // Don't show existing password
                name: user.name || '',
                role: user.role || 'user'
            });
        } else {
            setEditingUser(null);
            setFormData({
                email: '',
                password: '',
                name: '',
                role: 'user'
            });
        }
        setFormError('');
        setShowModal(true);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.email) {
            setFormError('Email is required');
            return;
        }

        if (!editingUser && !formData.password) {
            setFormError('Password is required for new users');
            return;
        }

        setSaving(true);
        try {
            if (editingUser) {
                // Update existing user
                const updateData = {
                    email: formData.email,
                    name: formData.name,
                    role: formData.role
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await api.update('users', editingUser.id, updateData);
                addToast('User updated successfully', 'success');
            } else {
                // Create new user
                await api.create('users', formData);
                addToast('User created successfully', 'success');
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async (userId) => {
        try {
            await api.remove('users', userId);
            addToast('User deleted successfully', 'success');
            setDeleteConfirm(null);
            fetchUsers();
        } catch (err) {
            addToast('Failed to delete user: ' + err.message, 'error');
        }
    };

    // Toggle user active status
    const toggleUserStatus = async (user) => {
        try {
            await api.update('users', user.id, { is_active: !user.is_active });
            addToast(`User ${user.is_active ? 'disabled' : 'enabled'} successfully`, 'success');
            fetchUsers();
        } catch (err) {
            addToast('Failed to update user status: ' + err.message, 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UsersIcon className="w-7 h-7" />
                        Users
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage user accounts and permissions
                    </p>
                </div>
                <Button variant="primary" onClick={() => openModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Search */}
            <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search users..."
            />

            {/* Users List */}
            {filteredUsers.length === 0 ? (
                <EmptyState
                    icon={UsersIcon}
                    title="No users found"
                    description={searchQuery ? "Try a different search term" : "Create your first user to get started"}
                />
            ) : (
                <div className="grid gap-4">
                    {filteredUsers.map(user => (
                        <Card key={user.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                                    }`}>
                                        {user.role === 'admin' ? (
                                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        ) : (
                                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {user.name || user.email}
                                            </span>
                                            <Badge color={user.role === 'admin' ? 'purple' : 'blue'}>
                                                {user.role}
                                            </Badge>
                                            {!user.is_active && (
                                                <Badge color="red">Disabled</Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {user.email}
                                        </div>
                                        {user.last_login_at && (
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                Last login: {formatDate(user.last_login_at)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleUserStatus(user)}
                                        title={user.is_active ? 'Disable user' : 'Enable user'}
                                    >
                                        {user.is_active ? (
                                            <X className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <Check className="w-4 h-4 text-green-500" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openModal(user)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    {user.id !== currentUser?.id && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteConfirm(user)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
            <Modal
                onClose={() => setShowModal(false)}
                title={editingUser ? 'Edit User' : 'Create User'}
            >
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                        </label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="User's name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email *
                        </label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Password {editingUser ? '(leave blank to keep current)' : '*'}
                        </label>
                        <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                            required={!editingUser}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
            <Modal
                onClose={() => setDeleteConfirm(null)}
                title="Delete User"
            >
                <div className="p-4 sm:p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete <strong>{deleteConfirm?.name || deleteConfirm?.email}</strong>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
            )}
        </div>
    );
};

export default Users;
