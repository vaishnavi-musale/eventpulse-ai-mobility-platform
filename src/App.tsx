import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { NotifProvider } from "@/components/Notifications";
import { BackendProvider } from "@/api/status";
import { AppShell } from "@/components/layout";
import { StoreProvider } from "@/store";
import Confirmation from "@/pages/Confirmation";
import Discovery from "@/pages/Discovery";
import Disruption from "@/pages/Disruption";
import EventDetails from "@/pages/EventDetails";
import VenueMapPage from "@/pages/VenueMapPage";
import Feedback from "@/pages/Feedback";
import HostEvent from "@/pages/HostEvent";
import IntentCapture from "@/pages/IntentCapture";
import Journey from "@/pages/Journey";
import Landing from "@/pages/Landing";
import Offers from "@/pages/Offers";
import Organizer from "@/pages/Organizer";
import Overview from "@/pages/organizer/Overview";
import Checkin from "@/pages/organizer/Checkin";
import Capacity from "@/pages/organizer/Capacity";
import Attendees from "@/pages/organizer/Attendees";
import Escrow from "@/pages/organizer/Escrow";
import Comms from "@/pages/organizer/Comms";
import Whereabouts from "@/pages/organizer/Whereabouts";
import VenueMap from "@/pages/organizer/VenueMap";
import Profile from "@/pages/Profile";
import AccountLayout from "@/pages/account/AccountLayout";
import Bookings from "@/pages/account/Bookings";
import Wallet from "@/pages/account/Wallet";
import NotificationsPage from "@/pages/account/NotificationsPage";
import Settings from "@/pages/account/Settings";
import AccountSupport from "@/pages/account/Support";
import Recommendations from "@/pages/Recommendations";
import ServiceVerify from "@/pages/ServiceVerify";
import VerifyCapacity from "@/pages/VerifyCapacity";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <StoreProvider>
      <NotifProvider>
        <BackendProvider>
          <HashRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="discover" replace />} />
              <Route path="discover" element={<Discovery />} />
              <Route path="event/:id" element={<EventDetails />} />
              <Route path="event/:id/venue-map" element={<VenueMapPage />} />
              <Route path="intent" element={<IntentCapture />} />
              <Route path="options" element={<Recommendations />} />
              <Route path="verify" element={<VerifyCapacity />} />
              <Route path="offer" element={<Offers />} />
              <Route path="confirm" element={<Confirmation />} />
              <Route path="journey" element={<Journey />} />
              <Route path="disruption" element={<Disruption />} />
              <Route path="verify-service" element={<ServiceVerify />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="account" element={<AccountLayout />}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<Profile />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="support" element={<AccountSupport />} />
              </Route>
              <Route path="profile" element={<Navigate to="/app/account/profile" replace />} />
            </Route>
            <Route path="/admin/organizer" element={<Organizer />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="whereabouts" element={<Whereabouts />} />
              <Route path="venue-map" element={<VenueMap />} />
              <Route path="check-in" element={<Checkin />} />
              <Route path="capacity" element={<Capacity />} />
              <Route path="attendees" element={<Attendees />} />
              <Route path="escrow" element={<Escrow />} />
              <Route path="mode" element={<Comms />} />
            </Route>
            <Route path="/admin/host-event" element={<HostEvent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </HashRouter>
        </BackendProvider>
      </NotifProvider>
    </StoreProvider>
  );
}
