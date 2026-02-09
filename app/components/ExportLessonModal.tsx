'use client';

import { useState, useMemo } from 'react';
import { X, FileDown, Check, Users } from 'lucide-react';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { LessonRecord, Coach, LessonType } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  lessonRecords: LessonRecord[];
  coaches: Coach[];
  lessonTypes: LessonType[];
  dateRange: { startDate?: string; endDate?: string };
};

export default function ExportLessonModal({
  isOpen,
  onClose,
  lessonRecords,
  coaches,
  lessonTypes,
  dateRange,
}: Props) {
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // 获取有课程记录的教练
  const coachesWithRecords = useMemo(() => {
    const coachIds = new Set(lessonRecords.map((r) => r.coachId));
    return coaches.filter((c) => coachIds.has(c.id));
  }, [lessonRecords, coaches]);

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCoachIds.size === coachesWithRecords.length) {
      setSelectedCoachIds(new Set());
    } else {
      setSelectedCoachIds(new Set(coachesWithRecords.map((c) => c.id)));
    }
  };

  // 切换单个教练选择
  const toggleCoach = (coachId: string) => {
    const newSet = new Set(selectedCoachIds);
    if (newSet.has(coachId)) {
      newSet.delete(coachId);
    } else {
      newSet.add(coachId);
    }
    setSelectedCoachIds(newSet);
  };

  // 格式化日期范围标题
  const getDateRangeTitle = () => {
    const start = dateRange.startDate || lessonRecords[0]?.dateStr || '';
    const end = dateRange.endDate || lessonRecords[lessonRecords.length - 1]?.dateStr || '';
    if (start && end) {
      return `${start} - ${end} 课程记录`;
    }
    return '课程记录';
  };

  // 生成并导出 DOCX
  const handleExport = async () => {
    if (selectedCoachIds.size === 0) return;

    setIsExporting(true);

    try {
      const filteredRecords = lessonRecords.filter((r) =>
        selectedCoachIds.has(r.coachId)
      );

      // 按教练分组
      const recordsByCoach = new Map<string, LessonRecord[]>();
      filteredRecords.forEach((record) => {
        const existing = recordsByCoach.get(record.coachId) || [];
        existing.push(record);
        recordsByCoach.set(record.coachId, existing);
      });

      const docChildren: (Paragraph | Table)[] = [];

      // 文档标题
      docChildren.push(
        new Paragraph({
          text: getDateRangeTitle(),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // ========== 上方：所有教练的汇总统计 ==========
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '教练提成汇总',
              bold: true,
              size: 26,
            }),
          ],
          spacing: { before: 200, after: 200 },
        })
      );

      let grandTotalCommission = 0;

      // 为每个教练生成汇总
      for (const coachId of selectedCoachIds) {
        const coach = coaches.find((c) => c.id === coachId);
        if (!coach) continue;

        const coachRecords = recordsByCoach.get(coachId) || [];
        if (coachRecords.length === 0) continue;

        // 教练名称
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `【${coach.name}】`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        // 统计每类课程的次数和提成
        const lessonStats = new Map<
          string,
          { count: number; totalStudents: number; commission: number }
        >();

        coachRecords.forEach((record) => {
          const lessonType = record.lessonType;
          if (!lessonType) return;

          const existing = lessonStats.get(lessonType.id) || {
            count: 0,
            totalStudents: 0,
            commission: 0,
          };

          existing.count += 1;
          existing.totalStudents += record.studentCount || 1;

          // 根据计价方式计算提成
          if (lessonType.pricingType === 'PER_PERSON') {
            existing.commission += lessonType.commission * (record.studentCount || 1);
          } else {
            existing.commission += lessonType.commission;
          }

          lessonStats.set(lessonType.id, existing);
        });

        // 课程统计摘要
        let coachTotalCommission = 0;

        lessonStats.forEach((stats, lessonTypeId) => {
          const lessonType = lessonTypes.find((lt) => lt.id === lessonTypeId);
          if (!lessonType) return;

          coachTotalCommission += stats.commission;

          const displayText =
            lessonType.pricingType === 'PER_PERSON'
              ? `${lessonType.name}：${stats.count} 节（共 ${stats.totalStudents} 人次），提成 ¥${stats.commission.toFixed(2)}`
              : `${lessonType.name}：${stats.count} 节，提成 ¥${stats.commission.toFixed(2)}`;

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: displayText,
                  size: 20,
                }),
              ],
              spacing: { after: 60 },
              indent: { left: convertInchesToTwip(0.3) },
            })
          );
        });

        grandTotalCommission += coachTotalCommission;

        // 教练总提成
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `小计：¥${coachTotalCommission.toFixed(2)}`,
                bold: true,
                size: 22,
                color: '2E7D32',
              }),
            ],
            spacing: { before: 60, after: 100 },
            indent: { left: convertInchesToTwip(0.3) },
          })
        );
      }

      // 所有教练总提成
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `总计提成：¥${grandTotalCommission.toFixed(2)}`,
              bold: true,
              size: 26,
              color: '1B5E20',
            }),
          ],
          spacing: { before: 200, after: 300 },
        })
      );

      // 分隔线
      docChildren.push(
        new Paragraph({
          text: '',
          spacing: { after: 300 },
          border: {
            bottom: {
              color: 'CCCCCC',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      // ========== 下方：所有课程详情表格 ==========
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '课程详情',
              bold: true,
              size: 26,
            }),
          ],
          spacing: { before: 200, after: 200 },
        })
      );

      // 定义列宽（使用 DXA 单位，1英寸 = 1440 DXA，A4纸宽约6.5英寸可用）
      const totalWidth = 9360; // 约6.5英寸
      const colWidths = {
        date: Math.round(totalWidth * 0.14),
        coach: Math.round(totalWidth * 0.14),
        lessonType: Math.round(totalWidth * 0.18),
        studentCount: Math.round(totalWidth * 0.08),
        commission: Math.round(totalWidth * 0.12),
        note: Math.round(totalWidth * 0.34),
      };

      const tableRows: TableRow[] = [];

      // 表头
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '日期', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.date, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '教练', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.coach, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '课程类型', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.lessonType, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '人数', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.studentCount, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '提成', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.commission, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '备注', bold: true, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: colWidths.note, type: WidthType.DXA },
              shading: { fill: 'E8F5E9' },
            }),
          ],
        })
      );

      // 按日期排序所有记录
      const sortedRecords = [...filteredRecords].sort(
        (a, b) => a.dateStr.localeCompare(b.dateStr)
      );

      // 数据行
      sortedRecords.forEach((record) => {
        const lessonType = record.lessonType;
        const coach = coaches.find((c) => c.id === record.coachId);
        const commission =
          lessonType?.pricingType === 'PER_PERSON'
            ? (lessonType?.commission || 0) * (record.studentCount || 1)
            : lessonType?.commission || 0;

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: record.dateStr, size: 18 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: colWidths.date, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: coach?.name || '-', size: 18 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: colWidths.coach, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: lessonType?.name || '-', size: 18 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: colWidths.lessonType, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          lessonType?.pricingType === 'PER_PERSON'
                            ? String(record.studentCount || 1)
                            : '-',
                        size: 18,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: colWidths.studentCount, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `¥${commission.toFixed(2)}`,
                        size: 18,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: colWidths.commission, type: WidthType.DXA },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: record.note || '-', size: 18 }),
                    ],
                  }),
                ],
                width: { size: colWidths.note, type: WidthType.DXA },
              }),
            ],
          })
        );
      });

      // 添加表格
      docChildren.push(
        new Table({
          rows: tableRows,
          width: { size: totalWidth, type: WidthType.DXA },
          columnWidths: [
            colWidths.date,
            colWidths.coach,
            colWidths.lessonType,
            colWidths.studentCount,
            colWidths.commission,
            colWidths.note,
          ],
        })
      );

      // 创建文档
      const doc = new Document({
        sections: [
          {
            children: docChildren,
          },
        ],
      });

      // 生成并下载
      const blob = await Packer.toBlob(doc);
      const fileName = `课程记录_${dateRange.startDate || 'all'}_${dateRange.endDate || 'all'}.docx`;
      saveAs(blob, fileName);

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            导出课程记录
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 日期范围显示 */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              导出范围：
              <span className="font-medium text-slate-800">
                {dateRange.startDate || '全部'} ~ {dateRange.endDate || '全部'}
              </span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              共 {lessonRecords.length} 条记录
            </p>
          </div>

          {/* 教练选择 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                选择教练
              </label>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedCoachIds.size === coachesWithRecords.length
                  ? '取消全选'
                  : '全选'}
              </button>
            </div>

            {coachesWithRecords.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                当前筛选条件下没有课程记录
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {coachesWithRecords.map((coach) => {
                  const recordCount = lessonRecords.filter(
                    (r) => r.coachId === coach.id
                  ).length;
                  const isSelected = selectedCoachIds.has(coach.id);

                  return (
                    <div
                      key={coach.id}
                      onClick={() => toggleCoach(coach.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: coach.color }}
                      >
                        {coach.avatar}
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-700">
                        {coach.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {recordCount} 条记录
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 已选择数量 */}
          {selectedCoachIds.size > 0 && (
            <p className="text-sm text-slate-600 mb-4">
              已选择 {selectedCoachIds.size} 位教练，共{' '}
              {
                lessonRecords.filter((r) => selectedCoachIds.has(r.coachId))
                  .length
              }{' '}
              条记录
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCoachIds.size === 0 || isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                导出 DOCX
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

