// pages/index.js
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>ParkarLabs - Personal Lab Environment</title>
        <meta
          name="description"
          content="Revolutionize learning with ParkarLabs - Your personal cloud-based lab environment"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="https://cdn.prod.website-files.com/66fa50f0631f1401a2a41200/6756dfa69388c348de24fe50_Fav%20Icon.png"
        />
      </Head>

      <div className="bg-[#0a0e27] text-white font-sans min-h-screen">
        {/* Navbar */}
        <nav className="flex justify-between items-center px-4 sm:px-8 md:px-16 lg:px-20 xl:px-32 py-4 border-b border-gray-700">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Parkar<span className="text-blue-500">Labs</span>
          </h1>
          <Link
            href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors duration-200"
          >
            Login
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="px-4 sm:px-8 md:px-16 lg:px-20 xl:px-32 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text Content */}
            <div className="flex-1 lg:max-w-xl xl:max-w-2xl">
              <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight">
                Revolutionize <span className="text-blue-500">Learning</span>
                <br />
                with ParkarLabs
              </h2>
              <p className="text-lg xl:text-xl text-gray-300 mb-8 leading-relaxed">
                Log in to access hands-on labs, explore real-world scenarios, and
                build practical skills. Everything you need—right in your browser.
              </p>
              <Link
                href="/auth/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors duration-200 font-semibold text-lg"
              >
                Get Started
              </Link>
            </div>

            {/* Hero Image */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <img
                src="/images/representation-user-experience-interface-design-min.jpg"
                alt="ParkarLabs Interface Design"
                className="rounded-lg shadow-2xl w-full max-w-sm lg:max-w-md xl:max-w-lg h-72 lg:h-80 object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </section>

        {/* Lab Environment Section */}
        <section className="bg-gray-900/30 py-16 lg:py-20">
          <div className="px-4 sm:px-8 md:px-16 lg:px-20 xl:px-32">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              {/* Lab Image */}
              <div className="flex-1 flex justify-center lg:justify-start order-2 lg:order-1">
                <img
                  src="/images/innovative-futuristic-classroom-students-min.jpg"
                  alt="Futuristic Lab Environment"
                  className="rounded-lg shadow-2xl w-full max-w-sm lg:max-w-md xl:max-w-lg h-72 lg:h-80 object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              {/* Content */}
              <div className="flex-1 lg:max-w-xl xl:max-w-2xl order-1 lg:order-2">
                <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                  Your Personal Lab Environment
                </h3>
                <p className="text-gray-300 text-lg xl:text-xl mb-8 leading-relaxed">
                  ParkarLabs provides a secure, cloud-based personal lab environment
                  where you can practice and perfect your technical skills. Our platform is
                  designed for learners and professionals who need hands-on experience with real-world
                  scenarios.
                </p>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white">Create and manage virtual machines with just a few clicks</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white">Access pre-configured environments for various technologies</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white">Complete hands-on tasks and projects in a safe, isolated environment</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-white">Track your progress and save your work for future sessions</span>
                  </li>
                </ul>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/auth/login">
                    <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-white transition-colors duration-200 font-semibold">
                      Start Your Lab
                    </button>
                  </Link>
                  <button className="bg-transparent border-2 border-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg text-blue-400 hover:text-white transition-all duration-200 font-semibold">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Life at Parkar Section */}
        <section className="py-16 lg:py-20">
          <div className="px-4 sm:px-8 md:px-16 lg:px-20 xl:px-32">
            {/* Centered Heading + Paragraph */}
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <h3 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Life at Parkar
              </h3>
              <p className="text-gray-400 text-lg xl:text-xl leading-relaxed">
                Experience the vibrant culture and innovative environment that makes
                ParkarLabs a great place to work and learn.
              </p>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="overflow-hidden rounded-lg shadow-lg">
                <img
                  src="/images/DSC_7009-min.jpg"
                  alt="Team collaboration at ParkarLabs"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <div className="overflow-hidden rounded-lg shadow-lg">
                <img
                  src="/images/DSC_7050-min.jpg"
                  alt="Innovation and teamwork"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <div className="overflow-hidden rounded-lg shadow-lg">
                <img
                  src="/images/DSC_7104-min.jpg"
                  alt="Learning environment"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <div className="overflow-hidden rounded-lg shadow-lg">
                <img
                  src="/images/DSC_7292-min.jpg"
                  alt="Professional growth"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-700 py-8">
          <div className="px-4 sm:px-8 md:px-16 lg:px-20 xl:px-32 text-center">
            <p className="text-blue-500 font-semibold text-xl mb-2">ParkarLabs</p>
            <p className="text-gray-500 text-sm">© 2025 ParkarLabs. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
