// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Core;
using Inka.Engine.VirtualObjects.Providers.Abstracts;

namespace Inka.Engine.VirtualObjects.Providers.Local;

public sealed class LocalVirtualObjectProvider : VirtualObjectProvider<LocalVirtualObjectProviderMetadata>
{
    public LocalVirtualObjectProvider(LocalVirtualObjectProviderMetadata metadata) : base(metadata)
    {
    }

    public override Task<VirtualObjectTree> IndexAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        VirtualObjectTree root = new(new VirtualDirectory(
                Metadata.FullPath,
                string.Empty,
                Metadata.RootDirectory
            )
        );
        RecursiveEnumerateDirectories(Metadata, root, Metadata.FullPath);

        return Task.FromResult(root);

        static void RecursiveEnumerateDirectories(
            LocalVirtualObjectProviderMetadata metadata,
            VirtualObjectTree root,
            string directoryPath
        )
        {
            ArgumentVerifier.NotNull(root, nameof(root));
            ArgumentVerifier.NotNull(directoryPath, nameof(directoryPath));

            DirectoryInfo directoryInfo = new(directoryPath);
            FileInfo[] fileInfos = directoryInfo.GetFiles();

            foreach (FileInfo fileInfo in fileInfos)
                root.AddChild(new VirtualFile(
                        fileInfo.FullName,
                        fileInfo.FullName.Replace(metadata.FullPath, string.Empty),
                        fileInfo.Name,
                        fileInfo.Extension
                    )
                );

            string[] directories = Directory.GetDirectories(directoryPath, "*.*", SearchOption.TopDirectoryOnly);
            foreach (string directory in directories)
            {
                directoryInfo = new DirectoryInfo(directory);
                VirtualObjectTree child =
                    root.AddChild(new VirtualDirectory(
                            directory,
                            directory.Replace(metadata.FullPath, string.Empty),
                            directoryInfo.Name
                        )
                    );
                RecursiveEnumerateDirectories(metadata, child, Path.Combine(directoryPath, directory));
            }
        }
    }
}