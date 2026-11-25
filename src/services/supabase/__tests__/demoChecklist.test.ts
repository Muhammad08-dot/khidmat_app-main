/* eslint-env jest, node */
process.env.EXPO_PUBLIC_DEMO_MODE = 'true';

import { supabase } from '../client';
import { deleteUserAccountFlow } from '../accountDeletion';
import { createSignedJobMediaUrl } from '../legacy';
import { setLang, getLang, isRTL, t } from '../../../i18n';

describe('Demo Mode (No-DB) 11-Category App Checklist', () => {
  const customerEmail = `cust-${Date.now()}@khidmat.test`;
  const providerEmail = `prov-${Date.now()}@khidmat.test`;
  const password = 'Password123!';
  let customerId = '';
  let providerId = '';
  let bookingId = '';

  it('1. Email signup creates a new customer account', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: customerEmail,
      password,
      options: { data: { role: 'customer', name: 'Ali Customer' } },
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(customerEmail);
    customerId = data.user!.id;
  });

  it('2. Profile complete saves name and phone', async () => {
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ name: 'Ali Updated', city: 'Lahore' })
      .eq('id', customerId);
    expect(profErr).toBeNull();

    const { error: contactErr } = await supabase
      .from('profile_contacts')
      .upsert({ user_id: customerId, phone: '+923001112233' });
    expect(contactErr).toBeNull();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();
    expect(profile?.name).toBe('Ali Updated');
  });

  it('3. Customer home categories and EN/UR toggle work', async () => {
    const { data: providers } = await supabase.from('providers').select('*');
    expect(Array.isArray(providers)).toBe(true);
    expect((providers ?? []).length).toBeGreaterThan(0);

    await setLang('ur');
    expect(getLang()).toBe('ur');
    expect(isRTL(getLang())).toBe(true);
    expect(typeof t('tab_home')).toBe('string');

    await setLang('en');
    expect(getLang()).toBe('en');
    expect(isRTL(getLang())).toBe(false);
  });

  it('4 & 5. Provider signup, booking creation, and provider confirmation', async () => {
    const { data: provAuth, error: provErr } = await supabase.auth.signUp({
      email: providerEmail,
      password,
      options: { data: { role: 'provider', name: 'Usman Electrician', category: 'Electrician' } },
    });
    expect(provErr).toBeNull();
    providerId = provAuth.user!.id;

    const { data: created, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: providerId,
        service_type: 'Electrician',
        address: 'Model Town, Lahore',
        status: 'pending',
        price: 1500,
      })
      .select('*');
    expect(bookErr).toBeNull();
    bookingId = Array.isArray(created) ? created[0].id : (created as any).id;
    expect(bookingId).toBeTruthy();

    const { data: provBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId);
    expect(provBookings?.some((b: any) => b.id === bookingId)).toBe(true);

    const { error: confirmErr } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    expect(confirmErr).toBeNull();
  });

  it('6 & 8. Track screen live status updates and job photo signed URL', async () => {
    const { error: startErr } = await supabase
      .from('bookings')
      .update({ status: 'in_progress' })
      .eq('id', bookingId);
    expect(startErr).toBeNull();

    const photoPath = `${bookingId}/after-job.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('job_media')
      .upload(photoPath, new Blob(['img']), { contentType: 'image/jpeg' });
    expect(uploadErr).toBeNull();

    const { error: completeErr } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        metadata: { jobPhotos: [photoPath] },
      })
      .eq('id', bookingId);
    expect(completeErr).toBeNull();

    const { data: updated } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    expect(updated?.status).toBe('completed');

    const signed = await createSignedJobMediaUrl(updated.metadata.jobPhotos[0]);
    expect(signed).toContain(photoPath);
  });

  it('7. Chat customer <-> provider both directions', async () => {
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: customerId,
      content: 'Salam, kab tak pohanch rahe hain?',
    });
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: providerId,
      content: 'Walaikum Assalam, 10 minute mein.',
    });

    const { data: thread } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId);
    expect(thread?.length).toBe(2);
  });

  it('9. Inbox/Notifications empty state and real notification', async () => {
    const { data: emptyNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', customerId);
    expect(emptyNotifs).toEqual([]);

    await supabase.from('notifications').insert({
      user_id: customerId,
      title: 'Booking Confirmed',
      body: 'Usman confirmed your booking.',
      read: false,
    });

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', customerId);
    expect(notifs?.length).toBe(1);
  });

  it('11. Logout and login back persists session', async () => {
    await supabase.auth.signOut();
    const { data: signedOut } = await supabase.auth.getSession();
    expect(signedOut.session).toBeNull();

    const { data: signedIn, error: loginErr } = await supabase.auth.signInWithPassword({
      email: customerEmail,
      password,
    });
    expect(loginErr).toBeNull();
    expect(signedIn.session?.user?.id).toBe(customerId);

    const { data: persisted } = await supabase.auth.getSession();
    expect(persisted.session?.user?.email).toBe(customerEmail);
  });

  it('10. Delete account removes user and blocks re-login', async () => {
    const result = await deleteUserAccountFlow(customerId);
    expect(result.rpcDeleted).toBe(true);
    expect(result.authDeleted).toBe(true);

    const { error: reloginErr } = await supabase.auth.signInWithPassword({
      email: customerEmail,
      password,
    });
    expect(reloginErr).toBeTruthy();
  });
});
