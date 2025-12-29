export const en = {
    app: {
        title: 'Homework',
        subtitle: 'Hero',
        nav: {
            tasks: 'Tasks',
            analytics: 'Analytics',
            settings: 'Settings'
        },
        totalPoints: 'Total Points',
        points: 'Points',
        offlineReady: 'v1.0.0 • Offline Ready'
    },
    home: {
        title: "Today's Tasks",
        progress: 'Progress',
        noTasksTitle: 'No tasks for today',
        noTasksDesc: 'Add a new task to get started!',
        greeting: 'Hi {name},<br/>here is your mission! 🚀',
        taskNameDisplay: 'Task Name',
        addTaskTitle: 'Add New Task',
        inputs: {
            taskName: 'Task Name',
            placeholder: 'e.g. Solve 10 Math Problems',
            subject: 'Subject',
            points: 'Points'
        },
        buttons: {
            add: 'Add'
        },
        reward: 'Reward',
        deleteConfirm: 'Are you sure you want to delete this task?',
        subjects: {
            Math: 'Math',
            English: 'English',
            Science: 'Science',
            Art: 'Art',
            Reading: 'Reading',
            Sports: 'Sports',
            Other: 'Other'
        }
    },
    analytics: {
        title: 'Analytics',
        subtitle: 'Track your progress over time',
        tipTitle: 'Hero Tip!',
        tipDesc: '{name}, your speed is increasing! Every mission completed gets you closer to greatness. 🚀',
        exportCsv: 'Export CSV',
        weekActivity: "This Week's Activity",
        history: 'History',
        table: {
            date: 'Date',
            task: 'Task',
            subject: 'Subject',
            points: 'Points',
            status: 'Status',
            empty: 'No history available yet.'
        },
        status: {
            completed: 'Completed',
            pending: 'Pending'
        },
        exportFileName: 'homework_history'
    },
    settings: {
        title: 'Settings',
        subtitle: 'Manage your data',
        dataManagement: {
            title: 'Data Management',
            desc: 'Backup your progress or transfer it to another device.',
            backupBtn: 'Backup Data',
            backupSub: 'Download JSON file',
            restoreBtn: 'Restore Data',
            restoreSub: 'Upload JSON file',
            backupFileName: 'homework_hero_backup',
            userName: 'User Name',
            editProfile: 'Edit Profile'
        },
        danger: {
            title: 'Danger Zone',
            desc: 'Once you delete your data, there is no going back. Please be certain.',
            resetBtn: 'Reset All Data'
        },
        alerts: {
            exportFail: 'Failed to export data: ',
            importConfirm: 'This will merge the imported data with your current data. Existing tasks with same IDs will be updated. Continue?',
            importSuccess: 'Successfully restored {count} tasks!',
            importFail: 'Error importing data: ',
            invalidFormat: 'Invalid backup file format',
            deleteConfirm1: 'DANGER: This will permanently delete ALL your task history and points. This cannot be undone. Are you absolutely sure?',
            deleteConfirm2: 'Please confirm one more time. Delete everything?',
            resetSuccess: 'All data has been reset.'
        }
    }
};

export const zh = {
    app: {
        title: '作业',
        subtitle: '小英雄',
        nav: {
            tasks: '今日作业',
            analytics: '统计报表',
            settings: '设置管理'
        },
        totalPoints: '总积分',
        points: '积分',
        offlineReady: 'v1.0.0 • 支持离线使用'
    },
    home: {
        title: "今日作业",
        progress: '今日进度',
        noTasksTitle: '今天还没有作业哦',
        noTasksDesc: '快添加一项新任务开始吧！',
        greeting: '你好 {name}，<br/>这是你的今日挑战！🚀',
        taskNameDisplay: '任务名称',
        addTaskTitle: '添加新作业',
        inputs: {
            taskName: '作业名称',
            placeholder: '例如：完成10道数学题',
            subject: '科目',
            points: '积分奖励'
        },
        buttons: {
            add: '添加'
        },
        reward: '奖励',
        deleteConfirm: '确定要删除这项作业吗？',
        subjects: {
            Math: '数学',
            English: '英语',
            Science: '科学',
            Art: '美术',
            Reading: '阅读',
            Sports: '体育',
            Other: '其他'
        }
    },
    analytics: {
        title: '统计报表',
        subtitle: '记录你的每一次进步',
        tipTitle: '小英雄提示！',
        tipDesc: '{name}，你的完成效率正在提高！每一次挑战都让你离伟大更近一步。🚀',
        exportCsv: '导出表格',
        weekActivity: "本周表现",
        history: '历史记录',
        table: {
            date: '日期',
            task: '任务',
            subject: '科目',
            points: '积分',
            status: '状态',
            empty: '暂时没有历史记录。'
        },
        status: {
            completed: '已完成',
            pending: '未完成'
        },
        exportFileName: '作业打卡记录表'
    },
    settings: {
        title: '设置管理',
        subtitle: '管理你的数据',
        dataManagement: {
            title: '数据管理',
            desc: '备份你的进度，或将其转移到其他设备。',
            backupBtn: '数据备份',
            backupSub: '下载 JSON 文件',
            restoreBtn: '数据恢复',
            restoreSub: '上传 JSON 文件',
            backupFileName: '作业小英雄备份',
            userName: '用户姓名',
            editProfile: '修改资料'
        },
        danger: {
            title: '危险区域',
            desc: '一旦删除数据，将无法恢复。请谨慎操作。',
            resetBtn: '清空所有数据'
        },
        alerts: {
            exportFail: '导出失败: ',
            importConfirm: '这将把导入的数据与当前数据合并。相同ID的任务将被更新。是否继续？',
            importSuccess: '成功恢复了 {count} 项任务！',
            importFail: '导入出错: ',
            invalidFormat: '无效的备份文件格式',
            deleteConfirm1: '危险警告：这将永久删除所有的作业记录和积分。此操作无法撤销。你确定要这样做吗？',
            deleteConfirm2: '请再次确认。真的要删除所有内容吗？',
            resetSuccess: '所有数据已重置。'
        }
    }
};
