'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Account {
  account_id: number;
  name: string;
  code?: string;
  account_type: string;
  balance?: number;
  formatted_balance?: string;
}

export default function FundTransferPage() {
  const { get, post } = useApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<number, { balance: number; formatted_balance: string }>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    from_account: '',
    to_account: '',
    amount: '',
    memo: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tree, balancesResp] = await Promise.all([
          get('/accounts/tree/'),
          get('/accounts/balances/'),
        ]);
        const flat: Account[] = [];
        const flatten = (accs: any[]) => accs.forEach((a) => { flat.push(a); if (a.children && a.children.length) flatten(a.children); });
        flatten(tree || []);
        setAccounts(flat);
        const balObj: Record<number, { balance: number; formatted_balance: string }> = {};
        (balancesResp || []).forEach((b: any) => { balObj[b.account_id] = { balance: b.balance, formatted_balance: b.formatted_balance }; });
        setBalances(balObj);
      } catch (e: any) {
        toast.error('Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fromBalance = useMemo(() => {
    const id = Number(form.from_account);
    return id && balances[id] ? balances[id].formatted_balance : '$0.00';
  }, [form.from_account, balances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.from_account || !form.to_account) return toast.error('Select both accounts');
      if (form.from_account === form.to_account) return toast.error('From and To must be different');
      const payload = {
        date: form.date,
        from_account: Number(form.from_account),
        to_account: Number(form.to_account),
        amount: parseFloat(form.amount || '0') || 0,
        memo: form.memo,
      };
      await post('/accounts/transfer/', payload);
      toast.success('Transfer completed');
      setForm({ ...form, amount: '', memo: '' });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Transfer failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fund Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">Transfer Fund From</Label>
              <Select value={form.from_account} onValueChange={(v) => setForm({ ...form, from_account: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account_id} value={String(a.account_id)}>
                      {a.code ? `${a.code} - ` : ''}{a.name} ({a.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600">Current balance: {fromBalance}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Transfer Fund To</Label>
              <Select value={form.to_account} onValueChange={(v) => setForm({ ...form, to_account: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account_id} value={String(a.account_id)}>
                      {a.code ? `${a.code} - ` : ''}{a.name} ({a.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Transfer Amount</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="memo">Memo</Label>
              <Input id="memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="Optional note" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>Transfer</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


