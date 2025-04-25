import { useState } from 'react';
import { Lock, ArrowLeft, Calendar, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function PasswordReset() {
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Ensure the phone number is exactly 11 digits
    return digits.slice(0, 11);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhone(formattedPhone);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!phone || phone.length !== 11) {
        toast.error('Por favor, insira um número de telefone válido (11 dígitos)');
        return;
      }

      if (!dateOfBirth) {
        toast.error('Por favor, insira sua data de nascimento');
        return;
      }

      if (newPassword.length < 6) {
        toast.error('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      // Use RPC to reset password with proper hashing
      const { data: success, error: resetError } = await supabase
        .rpc('reset_customer_password_with_dob', {
          p_phone: phone,
          p_date_of_birth: dateOfBirth,
          p_new_password: newPassword
        });

      if (resetError) {
        throw resetError;
      }

      if (!success) {
        toast.error('Telefone ou data de nascimento incorretos');
        return;
      }

      toast.success('Senha alterada com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Recuperar Senha
            </h1>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="11999999999"
                  className="input-field text-lg pl-11"
                  required
                  maxLength={11}
                />
                <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Digite seu número de telefone cadastrado (11 dígitos)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="input-field text-lg pl-11"
                  required
                />
                <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Digite sua data de nascimento cadastrada
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field text-lg pl-11"
                  required
                  minLength={6}
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Mínimo de 6 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirme a Nova Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field text-lg pl-11"
                  required
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}