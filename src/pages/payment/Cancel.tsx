import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Cancelado
          </h1>
          
          <p className="text-gray-600 mb-6">
            O pagamento foi cancelado. Nenhum valor foi cobrado.
          </p>

          <Link
            to="/client"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para o Início
          </Link>
        </div>
      </div>
    </div>
  );
}