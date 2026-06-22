
const API_BASE_URL = '/api';

const apiClient = {
  getCards: () => fetch(`${API_BASE_URL}/cards`, { credentials: 'include' }).then(res => {
    if (!res.ok) throw new Error('Failed to fetch cards');
    return res.json();
  }),
  addCard: (card) => fetch(`${API_BASE_URL}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(card),
  }).then(res => {
    if (!res.ok) throw new Error('Failed to add card');
    return res.json();
  }),
  updateCard: (card) => fetch(`${API_BASE_URL}/cards/${card.cardNumber}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(card),
  }).then(res => {
    if (!res.ok) throw new Error('Failed to update card');
    return res.json();
  }),
};

const AddCardForm = ({ onSave, onCancel }) => {
  const [cardNumber, setCardNumber] = React.useState('');
  const [pin, setPin] = React.useState('');

  const handleSave = () => {
    if (cardNumber.length < 16 || pin.length < 4) {
      alert('Please enter a valid card number and PIN.');
      return;
    }
    onSave({ cardNumber, pin });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-[-2rem]">
      <h2 className="text-xl font-semibold mb-4">Add New Card</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">Card Number</label>
          <input
            type="text" id="cardNumber" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            maxLength="16"
          />
        </div>
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700">PIN</label>
          <input
            type="text" id="pin" value={pin} onChange={(e) => setPin(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            maxLength="4"
           />
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors">Save Card</button>
        </div>
      </div>
    </div>
  );
}

const CardDetail = ({ card, onBack, onUpdate }) => {
  const barcodeRef = React.useRef(null);
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notes, setNotes] = React.useState(card.notes || '');

  React.useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, `79936686504000${card.cardNumber}`, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 100,
        displayValue: true
      });
    }
  }, [card]);

  const handleSaveNotes = () => {
    onUpdate({ ...card, notes });
    setIsEditingNotes(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-[-2rem]">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors">← Back to List</button>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Card Number</h3>
          <p className="font-mono text-xl">{card.cardNumber}</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">PIN</h3>
          <p className="font-mono text-xl">{card.pin}</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Balance</h3>
          <p className="text-2xl font-bold">{`$${card.currentBalance}`}</p>
        </div>
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                {!isEditingNotes && (
                    <button onClick={() => setIsEditingNotes(true)} className="text-sm text-blue-600 hover:underline">Edit</button>
                )}
            </div>
            {isEditingNotes ? (
                <div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full h-24 p-2 border border-gray-300 rounded"
                        placeholder="Add your notes here..."
                    ></textarea>
                    <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={() => { setIsEditingNotes(false); setNotes(card.notes || ''); }} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                        <button onClick={handleSaveNotes} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-700">Save</button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-600 whitespace-pre-wrap min-h-[3rem]">{card.notes || 'No notes yet.'}</p>
            )}
        </div>
        <div className="flex justify-center">
          <svg ref={barcodeRef}></svg>
        </div>
      </div>
    </div>
  );
};

const Card = ({ card, onSelect }) => {
  return (
    <div
      className={`p-4 border rounded-lg shadow-sm cursor-pointer ${card.used ? 'bg-gray-200' : 'bg-white'}`}
      onClick={() => onSelect(card)}>
      <div className="flex justify-between items-center">
        <p className="font-mono text-lg">{`**** **** **** ${card.cardNumber.slice(-4)}`}</p>
        <p className="text-xl font-semibold">{`$${card.currentBalance}`}</p>
      </div>
    </div>
  );
};

const CardList = ({ cards, onSelectCard }) => {
  const cardList = cards || [];
  return (
    <div className="space-y-4">
      {cardList.map((card) => (
        <Card key={card.cardNumber} card={card} onSelect={onSelectCard} />
      ))}
    </div>
  );
};

const App = ({ isConnected }) => {
  const [cards, setCards] = React.useState([]);
  const [selectedCard, setSelectedCard] = React.useState(null);
  const [isAddingCard, setIsAddingCard] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const fetchCards = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const fetchedData = await apiClient.getCards();
      setCards(fetchedData.cards.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)));
    } catch (err) {
      setError('Failed to fetch cards from Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isConnected) {
      fetchCards();
    } else {
      setCards([]);
      setSelectedCard(null);
      setIsAddingCard(false);
      setError(null);
      setIsLoading(false);
    }
  }, [isConnected]);

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    setIsAddingCard(false);
  };

  const handleBackToList = () => {
    setSelectedCard(null);
  };

  const handleShowAddForm = () => {
    setSelectedCard(null);
    setIsAddingCard(true);
  };

  const handleHideAddForm = () => {
    setIsAddingCard(false);
  };

  const handleSaveCard = async ({ cardNumber, pin }) => {
    const newCardInfo = { cardNumber, pin };
    try {
      const addedCardData = await apiClient.addCard(newCardInfo);
      setCards(addedCardData.cards.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)));
      setIsAddingCard(false);
    } catch (err) {
      setError(`Failed to save the card: ${err.message}`);
    }
  };
  
  const handleUpdateCard = async (updatedCard) => {
    try {
      const response = await apiClient.updateCard(updatedCard);
      // Update the cards list and selected card with the fresh data from the server
      const updatedCards = response.cards.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      setCards(updatedCards);
      
      // Find the specific card that was updated to refresh the detail view
      const newlyUpdatedCard = updatedCards.find(c => c.cardNumber === updatedCard.cardNumber);
      if (newlyUpdatedCard) {
        setSelectedCard(newlyUpdatedCard);
      }
      
    } catch (err) {
      setError(`Failed to update the card: ${err.message}`);
      // Optionally, you might want to revert the local state or show a more specific error
    }
  };

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return <div className="text-center mt-[-2rem]">Loading cards...</div>;
  }

  if (error) {
    return <p className="text-red-500 text-center mt-[-2rem]">{error}</p>;
  }

  const renderContent = () => {
    if (isAddingCard) {
      return <AddCardForm onSave={handleSaveCard} onCancel={handleHideAddForm} />;
    }
if (selectedCard) {
    return <CardDetail card={selectedCard} onBack={handleBackToList} onUpdate={handleUpdateCard} />;
}
    return (
      <div className="bg-white p-4 rounded-lg shadow mt-[-2rem]">
        <h2 className="text-xl font-semibold mb-4">Your Cards</h2>
        <CardList cards={cards} onSelectCard={handleSelectCard} />
      </div>
    );
  }

  return (
    <React.Fragment>
      {renderContent()}
      {isConnected && !isAddingCard && !selectedCard && (
         <button
            onClick={handleShowAddForm}
            className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl shadow-lg hover:bg-blue-700 transition-colors">
           +
         </button>
      )}
    </React.Fragment>
  );
};

window.renderApp = (status) => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  const isConnected = status && status.status === 'connected';
  if(isConnected) {
    document.getElementById('connection-status').setAttribute('hidden', '');
  } else {
    document.getElementById('connection-status').removeAttribute('hidden');
    document.getElementById('app-shell').innerHTML = '<div id="root"></div>';
  }
  root.render(<App isConnected={isConnected} />);
};

document.getElementById('app-shell').innerHTML = '<div id="root"></div>';
