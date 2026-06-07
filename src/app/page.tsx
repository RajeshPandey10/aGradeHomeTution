import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">aGrade Home Tuition</span>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Admin Login
            </Link>
            <Link
              href="/admin/login"
              className="text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-4 py-24 md:py-32">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Find the Perfect Home Tutor for Your Child
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
            aGrade Home Tuition connects parents with qualified teachers in their area.
            Post tuition requirements, browse teacher profiles, and find the right match
            — all from one platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/admin/login"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              I&apos;m a Parent
            </Link>
            <Link
              href="/admin/login"
              className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              I&apos;m a Teacher
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center">How It Works</h2>
          <p className="mt-3 text-slate-500 text-center max-w-xl mx-auto">
            Three simple steps to get started
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Post a Request",
                desc: "Tell us what you need — subject, location, schedule, and budget. Your request goes live instantly.",
              },
              {
                step: "02",
                title: "Get Matched",
                desc: "Qualified teachers in your area review your request and apply. Review their profiles and choose the best fit.",
              },
              {
                step: "03",
                title: "Start Learning",
                desc: "Connect with your chosen teacher and begin tuition. No middlemen, no hidden fees.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl border border-slate-200 p-6">
                <span className="text-4xl font-bold text-blue-600">{item.step}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Why Choose aGrade?</h2>
          <p className="mt-3 text-slate-500 text-center max-w-xl mx-auto">
            Everything you need in one platform
          </p>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Verified Teachers", desc: "All teachers go through a profile verification process before they can accept students." },
              { title: "Location-Based Search", desc: "Find tutors near you. Filter by distance, subject, budget, and availability." },
              { title: "Secure Platform", desc: "Your data and transactions are protected. We never share your information without consent." },
              { title: "Real-Time Updates", desc: "Get instant notifications when teachers apply or when request status changes." },
              { title: "Flexible Scheduling", desc: "Set your own schedule. Choose from physical or online tuition options." },
              { title: "Transparent Pricing", desc: "No hidden charges. See the full fee breakdown before committing to any teacher." },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For Teachers ─── */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Are You a Teacher?</h2>
          <p className="mt-3 text-blue-100 max-w-xl mx-auto">
            Register your profile, get verified, and start receiving tuition requests from parents in your area.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-block px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            Register as Teacher
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} aGrade Home Tuition. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
