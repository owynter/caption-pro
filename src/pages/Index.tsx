import { MemeGenerator } from "@/components/MemeGenerator";

const Index = () => {
  try {
    return <MemeGenerator />;
  } catch (error) {
    console.error('Error loading MemeGenerator:', error);
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Error Loading App</h1>
        <p className="mt-4">Check browser console for details</p>
        <pre className="mt-4 text-left bg-gray-100 p-4 rounded">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
};

export default Index;
