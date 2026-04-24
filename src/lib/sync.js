import { supabase } from './supabase.js';

// ─── Profile ──────────────────────────────────────────────────────────────────
export const syncProfile = async (userId, user) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      first_name: user.firstName || '',
      last_name:  user.lastName  || '',
      phone:      user.phone     || '',
      email:      user.email     || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.error('syncProfile error:', error);
};

export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return {
    firstName: data.first_name,
    lastName:  data.last_name,
    phone:     data.phone,
    email:     data.email,
  };
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const syncTransactions = async (userId, txs) => {
  if (!txs || txs.length === 0) return;
  const rows = txs.map(tx => ({
    user_id:           userId,
    local_id:          tx.id,
    type:              tx.type              || '',
    date:              tx.date              || '',
    description:       tx.description      || '',
    amount:            parseFloat(tx.amount) || 0,
    category:          tx.category         || '',
    location:          tx.location         || '',
    payment:           tx.payment          || '',
    status:            tx.status           || '',
    notes:             tx.notes            || '',
    installments:      parseInt(tx.installments) || 0,
    installment_period: tx.installmentPeriod || 'M',
    installment_group: tx.installmentGroup  || '',
    recurring_id:      tx.recurringId       || '',
    updated_at:        new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,local_id' });
  if (error) console.error('syncTransactions error:', error);
};

export const fetchTransactions = async (userId) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) return null;
  return data.map(row => ({
    id:               row.local_id,
    type:             row.type,
    date:             row.date,
    description:      row.description,
    amount:           row.amount,
    category:         row.category,
    location:         row.location,
    payment:          row.payment,
    status:           row.status,
    notes:            row.notes,
    installments:     row.installments,
    installmentPeriod: row.installment_period,
    installmentGroup: row.installment_group,
    recurringId:      row.recurring_id,
  }));
};

export const deleteTransaction = async (userId, localId) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('local_id', localId);
  if (error) console.error('deleteTransaction error:', error);
};

// ─── Lists ────────────────────────────────────────────────────────────────────
export const syncLists = async (userId, lists) => {
  const { error } = await supabase
    .from('user_lists')
    .upsert({
      user_id:    userId,
      data:       lists,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) console.error('syncLists error:', error);
};

export const fetchLists = async (userId) => {
  const { data, error } = await supabase
    .from('user_lists')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data?.data || null;
};

// ─── Full sync (upload local → cloud) ────────────────────────────────────────
export const uploadAll = async (userId, { txs, lists, user }) => {
  await Promise.all([
    syncTransactions(userId, txs),
    syncLists(userId, lists),
    syncProfile(userId, user),
  ]);
};

// ─── Full fetch (cloud → local) ───────────────────────────────────────────────
export const downloadAll = async (userId, defLists) => {
  const [txs, lists, profile] = await Promise.all([
    fetchTransactions(userId),
    fetchLists(userId),
    fetchProfile(userId),
  ]);
  return {
    txs:    txs     || [],
    lists:  lists   || defLists,
    user:   profile || {},
  };
};
