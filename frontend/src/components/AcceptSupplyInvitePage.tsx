/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { supplyChainApi, ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Card from './ui/Card';

/**
 * Where a supply invitation lands. Unlike a team invite, this does NOT create an account inside
 * the inviting company: the supplier signs in to (or registers) its own company first, and the
 * link then joins the two. That is the whole difference between the two kinds of invitation, so
 * this page says it out loud rather than leaving the supplier to discover it.
 */
const AcceptSupplyInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const act = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (accept) {
        const link = await supplyChainApi.accept(token);
        setDone(`You are now linked to ${link.counterpartyName ?? 'your buyer'}.`);
      } else {
        await supplyChainApi.decline(token);
        setDone('Invitation declined.');
      }
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-navy-50/40">
      <Card className="p-8 max-w-lg w-full space-y-5">
        <div className="flex items-center space-x-2 text-xs font-semibold text-primary-600">
          <Link2 className="w-4 h-4" />
          <span className="px-2 py-0.5 bg-primary-50 rounded-md">Supply chain invitation</span>
        </div>
        <h1 className="text-xl font-bold text-navy-950">A buyer wants to link with you</h1>

        {!token ? (
          <p className="text-sm text-red-600">This invitation link is missing its token.</p>
        ) : done ? (
          <>
            <p className="text-sm text-navy-700">{done}</p>
            <Button onClick={() => navigate('/supply-chain')}>Go to supply chain</Button>
          </>
        ) : !isAuthenticated ? (
          <>
            <p className="text-sm text-navy-700">
              Sign in to your own company first, or register one. Accepting this invitation links
              two companies; it does not put your data inside theirs, and they never see your
              documents &mdash; only the figures you choose to share, and the sign-off behind them.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate(`/login?next=/accept-supply-invite?token=${token}`)}>
                Sign in
              </Button>
              <Link to="/register" className="text-sm text-primary-600 hover:underline self-center">
                Register a company
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-navy-700">
              Accepting lets this buyer see the Scope 1 and 2 figures you choose to publish, for the
              financial years you have signed off, together with the calculation behind them. Your
              documents are never shared, and you can withdraw the link at any time.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => void act(true)}>
                Accept
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void act(false)}>
                Decline
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AcceptSupplyInvitePage;
