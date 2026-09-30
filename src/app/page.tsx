import Downloader from "@/components/downloader";
import Sidebar from "@/components/sidebar";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-zinc-950 md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Downloader />
      </div>
    </main>
  );
}
