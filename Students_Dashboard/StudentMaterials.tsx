import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../services/api';
import { FileText, Download, Eye, Loader2, Filter } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  subject: string;
  board: string;
  standard: number;
  type: string;
  url: string;
  description?: string;
  createdAt?: any;
}

const StudentMaterials: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDarkMode } = useDarkMode();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    loadMaterials();
  }, [user]);

  const loadMaterials = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get student profile to know board and standard
      const profileResponse = await api.get<any>(`/students/${user.uid}`);
      const profile = profileResponse.student || profileResponse;
      setStudentProfile(profile);

      // Load materials for student's board and standard
      let query = `/materials?board=${profile.board}&standard=${profile.standard}&limit=100`;
      if (filterType !== 'all') {
        query += `&type=${filterType}`;
      }

      const response = await api.get<any>(query);
      setMaterials(response.materials || response.items || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (material: Material, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const link = document.createElement('a');
      link.href = material.url;
      link.download = material.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading ${material.title}...`, 'success');
    } catch (error) {
      showToast('Failed to download material', 'error');
    }
  };

  const getFileIcon = (type: string) => {
    const typeMap: { [key: string]: string } = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      ppt: '📊',
      pptx: '📊',
      xls: '📈',
      xlsx: '📈',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      zip: '📦',
      rar: '📦',
      video: '🎥',
      mp4: '🎥',
      webm: '🎥',
      audio: '🔊',
      mp3: '🔊',
      text: '📄',
      txt: '📄'
    };
    return typeMap[type.toLowerCase()] || '📁';
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return '-';
    const timestamp = dateObj._seconds ? dateObj._seconds * 1000 : new Date(dateObj).getTime();
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const uniqueTypes = Array.from(new Set(materials.map((m: Material) => m.type)));

  const filteredMaterials =
    filterType === 'all'
      ? materials
      : materials.filter((m: Material) => m.type === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}><FileText size={40} className="text-indigo-600" />Study Materials</h1>
        {studentProfile && (
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Materials for {studentProfile.board} - Standard {studentProfile.standard}
          </p>
        )}
      </div>

      {/* Filter */}
      {uniqueTypes.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Materials
          </button>
          {uniqueTypes.map((type: string) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-full font-medium transition-colors whitespace-nowrap ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className={`text-center py-12 rounded-lg shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <FileText className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No materials found</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No study materials available for {filterType !== 'all' ? filterType : 'your category'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material: Material) => (
            <div
              key={material.id}
              className={`rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}
            >
              {/* Material Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <div className="text-3xl mb-2">{getFileIcon(material.type)}</div>
                <h3 className="font-semibold truncate">{material.title}</h3>
                <p className="text-sm text-blue-100">{material.type.toUpperCase()}</p>
              </div>

              {/* Material Body */}
              <div className="p-4">
                {material.description && (
                  <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {material.description}
                  </p>
                )}

                <div className={`space-y-2 mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex justify-between">
                    <span>Subject:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{material.subject}</span>
                  </div>
                  {material.createdAt && (
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(material.createdAt)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.preventDefault()}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isDarkMode
                        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </a>
                  <button
                    onClick={(e) => handleDownload(material, e)}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isDarkMode
                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;
