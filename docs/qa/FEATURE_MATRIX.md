# Khidmat v2 — Feature & Interactive Element Matrix

Generated from codebase inventory (`docs/reports/qa-logs/phase1.txt`).

- **Routes in app/:** 25
- **onPress handlers found:** 187
- **testID selectors found:** 28

| ID | screen | element | expected behaviour | test method | result | evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| FM-001 | app/(auth)/auth.tsx:365 | `onPress={handleForgotPassword}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-002 | app/(auth)/auth.tsx:376 | `onPress={handleLoginSubmit}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-003 | app/(auth)/auth.tsx:390 | `onPress={handleGoogleSignIn}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-004 | app/(auth)/auth.tsx:401 | `onPress={async () => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-005 | app/(auth)/auth.tsx:555 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-006 | app/(auth)/auth.tsx:584 | `onPress={() => setCategory(spec)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-007 | app/(auth)/auth.tsx:626 | `onPress={() => setSignupStep(0)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-008 | app/(auth)/auth.tsx:632 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-009 | app/(auth)/auth.tsx:645 | `<Pressable onPress={pickPhoto} className="relative">` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-010 | app/(auth)/auth.tsx:661 | `<Pressable onPress={pickPhoto} className="mt-2">` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-011 | app/(auth)/auth.tsx:706 | `onPress={() => setSignupStep(1)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-012 | app/(auth)/auth.tsx:712 | `onPress={handleSignupSubmit}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-013 | app/(auth)/auth.tsx:725 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-014 | app/(auth)/reset-password.tsx:119 | `onPress={() => router.replace('/(auth)/auth')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-015 | app/(auth)/reset-password.tsx:158 | `<Button title="Update Password" onPress={handleSubmit} loadi` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-016 | app/(booking)/booking.tsx:219 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-017 | app/(booking)/booking.tsx:245 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-018 | app/(booking)/booking.tsx:301 | `onPress={() => setSelectedDate(date.value)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-019 | app/(booking)/booking.tsx:332 | `onPress={() => setSelectedTimeSlot(slot)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-020 | app/(booking)/booking.tsx:401 | `onPress={handleBookingConfirm}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-021 | app/(booking)/matching.tsx:197 | `onPress={() => router.replace('/')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-022 | app/(booking)/matching.tsx:291 | `onPress={handleFindProviders}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-023 | app/(booking)/track/[id].tsx:149 | `onPress: () => void dialEmergencyNumber('15', 'Police Emerge` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-024 | app/(booking)/track/[id].tsx:154 | `onPress: () => void dialEmergencyNumber('1122', 'Rescue 1122` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-025 | app/(booking)/track/[id].tsx:192 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-026 | app/(booking)/track/[id].tsx:239 | `onPress={handleCall}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-027 | app/(booking)/track/[id].tsx:245 | `onPress={handleChat}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-028 | app/(booking)/track/[id].tsx:269 | `onPress={handleEmergencySOS}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-029 | app/(tabs)/bookings.tsx:397 | `<Pressable key={tab} onPress={() => setActiveTab(tab)} class` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-030 | app/(tabs)/bookings.tsx:441 | `onPress={() => void refetch()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-031 | app/(tabs)/bookings.tsx:461 | `onPress={() => router.push('/')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-032 | app/(tabs)/bookings.tsx:586 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-033 | app/(tabs)/bookings.tsx:605 | `onPress={() => handleRatingSubmit(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-034 | app/(tabs)/bookings.tsx:629 | `onPress={() =>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-035 | app/(tabs)/bookings.tsx:651 | `onPress={() => router.push('/chat?bookingId=${b.bookingId}')` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-036 | app/(tabs)/bookings.tsx:661 | `onPress={() => requestReschedule(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-037 | app/(tabs)/bookings.tsx:671 | `onPress={() => router.push('/track/${b.bookingId}')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-038 | app/(tabs)/bookings.tsx:681 | `onPress={() => requestCancel(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-039 | app/(tabs)/bookings.tsx:691 | `onPress={() => requestCancel(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-040 | app/(tabs)/bookings.tsx:697 | `onPress={() => handleUpdateStatus(b, 'confirmed')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-041 | app/(tabs)/bookings.tsx:709 | `onPress={() => handleUpdateStatus(b, 'in_progress')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-042 | app/(tabs)/bookings.tsx:718 | `onPress={() => handleUpdateStatus(b, 'completed')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-043 | app/(tabs)/bookings.tsx:733 | `onPress={() => setPageLimit((prev) => prev + 10)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-044 | app/(tabs)/bookings.tsx:752 | `<Pressable className="flex-1 bg-black/50" onPress={() => set` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-045 | app/(tabs)/bookings.tsx:756 | `onPress={(e) => e.stopPropagation()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-046 | app/(tabs)/bookings.tsx:769 | `onPress={() => setCancelReason(r)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-047 | app/(tabs)/bookings.tsx:796 | `onPress={() => setCancellingBooking(null)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-048 | app/(tabs)/bookings.tsx:802 | `onPress={confirmCancel}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-049 | app/(tabs)/bookings.tsx:825 | `<Pressable className="flex-1 bg-black/50" onPress={() => set` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-050 | app/(tabs)/bookings.tsx:829 | `onPress={(e) => e.stopPropagation()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-051 | app/(tabs)/bookings.tsx:845 | `onPress={() => setReschedDate(d)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-052 | app/(tabs)/bookings.tsx:864 | `onPress={() => setReschedSlot(s)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-053 | app/(tabs)/bookings.tsx:881 | `onPress={() => setRescheduleBooking(null)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-054 | app/(tabs)/bookings.tsx:887 | `onPress={confirmReschedule}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-055 | app/(tabs)/inbox.tsx:152 | `onPress={() => router.push('/chat?bookingId=${convo.bookingI` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-056 | app/(tabs)/notifications.tsx:95 | `onPress={() => handlePress(n)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-057 | app/(tabs)/profile.tsx:81 | `onPress,` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-058 | app/(tabs)/profile.tsx:86 | `onPress: () => void;` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-059 | app/(tabs)/profile.tsx:90 | `<Pressable onPress={onPress} className="flex-row items-cente` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-060 | app/(tabs)/profile.tsx:251 | `onPress: async () => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-061 | app/(tabs)/profile.tsx:270 | `onPress: async () => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-062 | app/(tabs)/profile.tsx:318 | `onPress={handleEditPhoto}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-063 | app/(tabs)/profile.tsx:375 | `onPress={handleModeSwitch}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-064 | app/(tabs)/profile.tsx:439 | `onPress={() => handleSwitchLang('en')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-065 | app/(tabs)/profile.tsx:449 | `onPress={() => handleSwitchLang('ur')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-066 | app/(tabs)/profile.tsx:467 | `onPress={handleLogout}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-067 | app/(tabs)/profile.tsx:480 | `<LinkRow icon={Shield} label={t('nav_safety')} onPress={() =` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-068 | app/(tabs)/profile.tsx:485 | `onPress={() => router.push('/privacy')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-069 | app/(tabs)/profile.tsx:488 | `<LinkRow icon={Scale} label={t('nav_terms')} onPress={() => ` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-070 | app/(tabs)/profile.tsx:495 | `onPress={() => router.push('/admin')}` | Triggers handler action | unit / web-e2e | BLOCKED (no TEST DB) | phase1.txt / jest |
| FM-071 | app/(tabs)/profile.tsx:504 | `onPress={handleDeleteAccount}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-072 | app/(tabs)/profile.tsx:516 | `onPress={openAddAddr}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-073 | app/(tabs)/profile.tsx:544 | `<Pressable onPress={() => openEditAddr(a)} className="p-1.5"` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-074 | app/(tabs)/profile.tsx:547 | `<Pressable onPress={() => removeAddr(a.id)} className="p-1.5` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-075 | app/(tabs)/profile.tsx:640 | `onPress={() => router.push('/')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-076 | app/(tabs)/profile.tsx:653 | `onPress={() => router.push('/bookings')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-077 | app/(tabs)/profile.tsx:666 | `onPress={handleModeSwitch}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-078 | app/(tabs)/profile.tsx:697 | `onPress={() => setShowRegisterModal(false)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-079 | app/(tabs)/profile.tsx:741 | `onPress={handleRegisterWorker}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-080 | app/(tabs)/profile.tsx:760 | `<Pressable className="flex-1 bg-black/50" onPress={() => set` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-081 | app/(tabs)/profile.tsx:764 | `onPress={(e) => e.stopPropagation()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-082 | app/(tabs)/profile.tsx:775 | `onPress={() => setAddrLabel(l)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-083 | app/(tabs)/profile.tsx:802 | `onPress={() => setAddrModal(false)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-084 | app/(tabs)/profile.tsx:808 | `onPress={saveAddr}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-085 | app/+not-found.tsx:41 | `onPress={() => router.replace('/')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-086 | app/admin.tsx:139 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-087 | app/admin.tsx:194 | `onPress={() => setSection(tb.id)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-088 | app/admin.tsx:238 | `onPress={() => void handleOpenKycDoc((p as any).id_document_` | Triggers handler action | unit / web-e2e | BLOCKED (no TEST DB) | phase1.txt / jest |
| FM-089 | app/admin.tsx:249 | `onPress={() => verifyMut.mutate({ id: p.id, status: 'verifie` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-090 | app/admin.tsx:256 | `onPress={() => verifyMut.mutate({ id: p.id, status: 'rejecte` | Triggers handler action | unit / web-e2e | BLOCKED (no TEST DB) | phase1.txt / jest |
| FM-091 | app/admin.tsx:305 | `onPress={() =>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-092 | app/admin.tsx:316 | `onPress={() => delMut.mutate({ id: r.id, providerId: r.provi` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-093 | app/admin.tsx:355 | `onPress={() => resolveReportMut.mutate({ id: rp.id, action: ` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-094 | app/admin.tsx:362 | `onPress={() => resolveReportMut.mutate({ id: rp.id, action: ` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-095 | app/auth/callback.tsx:46 | `onPress={() => router.replace("/(auth)/auth")}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-096 | app/auth/complete-profile.tsx:55 | `onPress={() => setRole("customer")}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-097 | app/auth/complete-profile.tsx:63 | `onPress={() => setRole("provider")}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-098 | app/auth/complete-profile.tsx:92 | `onPress={handleComplete}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-099 | app/categories.tsx:101 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-100 | app/categories.tsx:126 | `onPress={() => router.push('/matching?category=${encodeURICo` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-101 | app/chat.tsx:322 | `onPress={() => router.push('/inbox')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-102 | app/chat.tsx:354 | `onPress={() => router.push('/track/${booking.bookingId}')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-103 | app/chat.tsx:362 | `onPress={() => Linking.openURL('tel:${booking.customerPhone}` | Triggers handler action | manual-device | NOT-TESTABLE-HERE | phase1.txt / jest |
| FM-104 | app/chat.tsx:369 | `onPress={() => setShowReportModal(true)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-105 | app/chat.tsx:504 | `onPress={() => sendText(q)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-106 | app/chat.tsx:524 | `onPress={handleSendMessage}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-107 | app/chat.tsx:542 | `<Pressable className="flex-1 bg-black/50" onPress={() => set` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-108 | app/chat.tsx:546 | `onPress={(e) => e.stopPropagation()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-109 | app/chat.tsx:553 | `<Pressable onPress={() => setShowReportModal(false)} classNa` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-110 | app/chat.tsx:563 | `onPress={() => setReportReason(r)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-111 | app/chat.tsx:592 | `onPress={() => setShowReportModal(false)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-112 | app/chat.tsx:598 | `onPress={handleSendReport}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-113 | app/privacy.tsx:90 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-114 | app/provider/[id].tsx:146 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-115 | app/provider/[id].tsx:175 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-116 | app/provider/[id].tsx:247 | `onPress={() => router.push('/booking?providerId=${provider.u` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-117 | app/provider/[id].tsx:263 | `onPress={handleNotifyWorker}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-118 | app/provider/[id].tsx:285 | `onPress={() => router.push('/booking?providerId=${provider.u` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-119 | app/providers.tsx:233 | `onPress={() => router.replace('/')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-120 | app/providers.tsx:293 | `onPress={() => router.push('/provider/${p.userId}')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-121 | app/providers.tsx:369 | `onPress={() => handleNotifyWorker(p)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-122 | app/safety.tsx:67 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-123 | app/terms.tsx:84 | `onPress={() => router.back()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-124 | src/components/features/CustomerHome.tsx:140 | `onPress={() => router.push('/profile')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-125 | src/components/features/CustomerHome.tsx:152 | `onPress={() => router.push('/notifications')}` | Triggers handler action | manual-device | NOT-TESTABLE-HERE | phase1.txt / jest |
| FM-126 | src/components/features/CustomerHome.tsx:200 | `onPress={() => router.push('/bookings')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-127 | src/components/features/CustomerHome.tsx:214 | `<Pressable onPress={() => router.push('/categories')}>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-128 | src/components/features/CustomerHome.tsx:225 | `onPress={() => openCategory(cat.name)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-129 | src/components/features/CustomerHome.tsx:255 | `<Pressable onPress={() => router.push('/providers')}>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-130 | src/components/features/CustomerHome.tsx:270 | `onPress={() => router.push('/provider/${prov.id}')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-131 | src/components/features/CustomerHome.tsx:289 | `onPress={() => router.push('/safety')}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-132 | src/components/features/LiveMap.tsx:51 | `onPress={() => setRetryNonce((n) => n + 1)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-133 | src/components/features/MapSelector.tsx:47 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-134 | src/components/features/ProviderHome.tsx:225 | `onPress={toggleOnline}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-135 | src/components/features/ProviderHome.tsx:379 | `onPress={() => declineBooking(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-136 | src/components/features/ProviderHome.tsx:384 | `onPress={() => acceptBooking(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-137 | src/components/features/ProviderHome.tsx:414 | `onPress={() => openChat(b.bookingId // b.id)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-138 | src/components/features/ProviderHome.tsx:419 | `onPress={() => openCompleteModal(b)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-139 | src/components/features/ProviderHome.tsx:446 | `onPress={() => setCodCashReceived(!codCashReceived)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-140 | src/components/features/ProviderHome.tsx:462 | `onPress={pickCompletionPhoto}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-141 | src/components/features/ProviderHome.tsx:477 | `onPress={() => setCompletingBooking(null)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-142 | src/components/features/ProviderHome.tsx:482 | `onPress={confirmComplete}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-143 | src/components/features/SiteAgentWidget.tsx:87 | `onPress={() => setIsOpen((o) => !o)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-144 | src/components/features/SiteAgentWidget.tsx:117 | `<Pressable className="absolute inset-0" onPress={() => setIs` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-145 | src/components/features/SiteAgentWidget.tsx:134 | `<Pressable onPress={clearChat}>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-146 | src/components/features/SiteAgentWidget.tsx:137 | `<Pressable onPress={() => setIsOpen(false)}>` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-147 | src/components/features/SiteAgentWidget.tsx:186 | `onPress={() => send(s)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-148 | src/components/features/SiteAgentWidget.tsx:206 | `onPress={() => send()}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-149 | src/components/layout/ErrorBoundary.tsx:91 | `onPress={this.reset}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-150 | src/components/ui/Button.tsx:9 | `onPress?: () => void;` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-151 | src/components/ui/Button.tsx:53 | `onPress,` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-152 | src/components/ui/Button.tsx:68 | `onPress={onPress}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-153 | src/components/ui/Chip.tsx:7 | `onPress?: () => void;` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-154 | src/components/ui/Chip.tsx:16 | `onPress,` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-155 | src/components/ui/Chip.tsx:24 | `onPress={onPress}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-156 | src/components/ui/EmptyState.tsx:44 | `<Pressable onPress={onAction} className="w-full rounded-xl b` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-157 | src/components/ui/GoogleButton.tsx:6 | `onPress: () => void;` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-158 | src/components/ui/GoogleButton.tsx:15 | `onPress,` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-159 | src/components/ui/GoogleButton.tsx:25 | `onPress={onPress}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-160 | src/components/ui/Input.tsx:94 | `onPress={onTogglePassword}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-161 | src/components/ui/Input.tsx:106 | `onPress={onTrailingPress}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-162 | src/components/ui/ProviderCard.tsx:15 | `onPress?: () => void;` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-163 | src/components/ui/ProviderCard.tsx:27 | `onPress,` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-164 | src/components/ui/ProviderCard.tsx:34 | `onPress={onPress}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-165 | src/components/ui/SegmentedControl.tsx:41 | `onPress={() => onChange(opt.value)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-166 | src/components/ui/Select.tsx:36 | `onPress={() => setOpen(true)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-167 | src/components/ui/Select.tsx:46 | `onPress={() => setOpen(false)}` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-168 | src/components/ui/Select.tsx:55 | `onPress={() => {` | Triggers handler action | unit / web-e2e | PASS (demo/unit) | phase1.txt / jest |
| FM-169 | src/components/ui/__tests__/primitives.test.tsx:15 | `const onPress = jest.fn();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-170 | src/components/ui/__tests__/primitives.test.tsx:18 | `tree = renderer.create(<Button title="Book Service" onPress=` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-171 | src/components/ui/__tests__/primitives.test.tsx:24 | `pressable.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-172 | src/components/ui/__tests__/primitives.test.tsx:26 | `expect(onPress).toHaveBeenCalledTimes(1);` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-173 | src/components/ui/__tests__/primitives.test.tsx:47 | `toggle.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-174 | src/components/ui/__tests__/primitives.test.tsx:72 | `providerTab.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-175 | src/components/ui/__tests__/primitives.test.tsx:78 | `const onPress = jest.fn();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-176 | src/components/ui/__tests__/primitives.test.tsx:82 | `<GoogleButton onPress={onPress} label="Continue with Google"` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-177 | src/components/ui/__tests__/primitives.test.tsx:89 | `btn.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-178 | src/components/ui/__tests__/primitives.test.tsx:91 | `expect(onPress).toHaveBeenCalledTimes(1);` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-179 | src/components/ui/__tests__/primitives.test.tsx:104 | `const onPress = jest.fn();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-180 | src/components/ui/__tests__/primitives.test.tsx:107 | `tree = renderer.create(<Chip label="Plumber" selected onPres` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-181 | src/components/ui/__tests__/primitives.test.tsx:113 | `chip.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-182 | src/components/ui/__tests__/primitives.test.tsx:115 | `expect(onPress).toHaveBeenCalledTimes(1);` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-183 | src/components/ui/__tests__/primitives.test.tsx:131 | `test('ProviderCard renders details and fires onPress', () =>` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-184 | src/components/ui/__tests__/primitives.test.tsx:132 | `const onPress = jest.fn();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-185 | src/components/ui/__tests__/primitives.test.tsx:144 | `onPress={onPress}` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-186 | src/components/ui/__tests__/primitives.test.tsx:152 | `card.props.onPress();` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |
| FM-187 | src/components/ui/__tests__/primitives.test.tsx:154 | `expect(onPress).toHaveBeenCalledTimes(1);` | Triggers handler action | unit | PASS (demo/unit) | phase1.txt / jest |

**Reconciliation:** 187 onPress handlers found, 187 handler rows in matrix.
