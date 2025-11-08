import React from 'react';

interface HistoryItem {
  id: string;
  timestamp: number;
  concept: {
    title: string;
    description: string;
  };
  imageUrl: string;
}

const HistoryPage: React.FC = () => {
  // In a real implementation, this would come from persistent storage
  const historyItems: HistoryItem[] = [];

  const handleDownload = (item: HistoryItem) => {
    const link = document.createElement('a');
    link.href = item.imageUrl;
    link.download = `cartoon-${item.concept.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (historyItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Cartoon History</h2>
        <p className="text-gray-600">You haven't generated any cartoons yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Cartoon History</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {historyItems.map(item => (
          <div key={item.id} className="border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium">{item.concept.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="p-2">
              <img
                src={item.imageUrl}
                alt={item.concept.title}
                className="w-full h-auto"
              />
            </div>

            <div className="p-4 flex justify-between">
              <button
                onClick={() => handleDownload(item)}
                className="text-blue-600 hover:underline"
              >
                Download
              </button>

              <button
                className="text-gray-600 hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
